import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { renderToStream } from "@react-pdf/renderer";
import { InvoicePDFTemplate } from "@/components/pdf/InvoicePDFTemplate";
import React from "react";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;

        const invoice = await db.query.invoices.findFirst({
            where: eq(invoices.id, id),
            with: {
                items: true,
                booking: true,
            }
        });

        if (!invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        const isStaff = user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SALES_REP;
        if (!isStaff && invoice.userId !== user.id) {
            return NextResponse.json({ error: "Unauthorized access to invoice" }, { status: 403 });
        }

        const templateProps = {
            invoice: {
                invoiceNumber: invoice.invoiceNumber,
                customerName: invoice.customerName,
                customerEmail: invoice.customerEmail || undefined,
                customerPhone: invoice.customerPhone || undefined,
                invoiceType: invoice.invoiceType,
                issueDate: invoice.issueDate.toISOString(),
                dueDate: invoice.dueDate.toISOString(),
                paymentTerms: invoice.paymentTerms || undefined,
                currency: invoice.currency,
                subtotal: invoice.subtotal,
                discount: invoice.discount,
                logisticsCost: invoice.logisticsCost,
                laborCost: invoice.laborCost,
                additionalCharges: invoice.additionalCharges,
                totalAmount: invoice.totalAmount,
                amountPaid: invoice.amountPaid,
                amountDue: invoice.amountDue,
                status: invoice.status,
                notes: invoice.notes || undefined,
                items: invoice.items.map(it => ({
                    id: it.id,
                    description: it.description,
                    units: it.units,
                    days: it.days,
                    unitPrice: it.unitPrice,
                    lineTotal: it.lineTotal,
                }))
            }
        };

        const stream = await renderToStream(React.createElement(InvoicePDFTemplate, templateProps as any) as any);

        return new NextResponse(stream as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
            }
        });
    } catch (e: any) {
        console.error("Invoice PDF Render Error:", e);
        return NextResponse.json({ error: e.message || "Failed to generate PDF" }, { status: 500 });
    }
}

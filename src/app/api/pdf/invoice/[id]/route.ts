import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, siteSettings } from "@/lib/db/schema";
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

        // Object-level permission enforcement:
        // - Super Admin and Admin: Full access
        // - Sales Representative: Assigned client/deal scope only
        // - Client: Own organization's invoices only
        // - Warehouse & Vendor: Strictly Denied (403)
        const isSuperOrAdmin = user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN;
        const isAssignedSalesRep = user.role === USER_ROLES.SALES_REP && (invoice.userId === user.id || invoice.booking?.userId === user.id);
        const isInvoiceOwner = invoice.userId === user.id;

        if (!isSuperOrAdmin && !isAssignedSalesRep && !isInvoiceOwner) {
            return NextResponse.json({ 
                error: "Access Denied: You do not have permission to access or download this invoice PDF." 
            }, { status: 403 });
        }

        // Fetch dynamic billing settings
        const bankSetting = await db.query.siteSettings.findFirst({
            where: eq(siteSettings.key, "billing_payment_methods")
        });
        const companyDetails = (bankSetting?.value as any)?.bankDetails || undefined;

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
            },
            companyDetails
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

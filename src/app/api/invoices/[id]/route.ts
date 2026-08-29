import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";

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
                items: {
                    with: { product: true }
                },
                payments: true,
                creditNotes: true,
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

        return NextResponse.json({ invoice });
    } catch (e: any) {
        console.error("Invoice GET Error:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}

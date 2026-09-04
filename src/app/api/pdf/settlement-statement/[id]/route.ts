import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import VendorSettlementStatementPDF from "@/components/finance/VendorSettlementStatementPDF";
import { db } from "@/lib/db";
import { vendorSettlementStatements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { getCurrentUser } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const statement = await db.query.vendorSettlementStatements.findFirst({
            where: eq(vendorSettlementStatements.id, id),
            with: {
                vendor: {
                    with: { user: true }
                },
                items: {
                    with: {
                        booking: {
                            with: { product: true }
                        }
                    }
                }
            }
        });

        if (!statement) {
            return NextResponse.json({ error: "Settlement statement not found" }, { status: 404 });
        }

        // Authorization check
        const isStaff = user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN;
        const isOwnerVendor = user.role === USER_ROLES.VENDOR && (user.vendorId === statement.vendorId || statement.vendor?.userId === user.id);
        if (!isStaff && !isOwnerVendor) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const data = {
            statementNumber: statement.statementNumber,
            date: format(new Date(statement.createdAt), "MMMM do, yyyy"),
            periodStart: format(new Date(statement.periodStart), "MMM do, yyyy"),
            periodEnd: format(new Date(statement.periodEnd), "MMM do, yyyy"),
            status: statement.status,
            vendorName: statement.vendor?.companyName || "Equipment Partner",
            vendorEmail: statement.vendor?.email || statement.vendor?.user?.email || "vendor@partner.e3qa.com",
            vendorPhone: statement.vendor?.phone || statement.vendor?.user?.phoneNumber || undefined,
            vendorCr: statement.vendor?.crNumber || undefined,
            bankName: statement.bankName || statement.vendor?.bankName || "Qatar National Bank (QNB)",
            bankIban: statement.bankIban || statement.vendor?.iban || "QA00QNBA00000000000000",
            transactionReference: statement.transactionReference || undefined,
            paidAt: statement.paidAt ? format(new Date(statement.paidAt), "MMM do, yyyy HH:mm") : null,
            totalBookingsCount: statement.totalBookingsCount,
            grossRevenue: statement.grossRentalRevenue,
            commissionTotal: statement.platformCommissionTotal,
            netPayable: statement.netPayableToVendor,
            items: statement.items.map((item) => ({
                bookingId: item.bookingId,
                projectName: item.booking?.projectName || item.booking?.product?.name || "Rental Deployment",
                dates: item.booking 
                    ? `${format(new Date(item.booking.startDate), "MM/dd")} - ${format(new Date(item.booking.endDate), "MM/dd")}`
                    : "N/A",
                grossAmount: item.bookingAmount,
                commissionRate: item.commissionRate,
                commissionAmount: item.commissionAmount,
                vendorEarnings: item.vendorEarnings,
            })),
        };

        const stream = await renderToStream(VendorSettlementStatementPDF({ data }));

        return new Response(stream as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="E3-Settlement-Statement-${statement.statementNumber}.pdf"`,
            }
        });

    } catch (e: any) {
        console.error("PDF settlement statement error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

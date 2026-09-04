import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendorSettlementStatements, settlementStatementItems, bookings, vendors } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.VENDOR,
    ]);
    if (error) return error;

    try {
        const url = new URL(req.url);
        const vendorId = url.searchParams.get("vendorId");
        const status = url.searchParams.get("status");

        const isVendor = user.role === USER_ROLES.VENDOR;
        const targetVendorId = isVendor ? user.vendorId : vendorId;

        const statements = await db.query.vendorSettlementStatements.findMany({
            where: and(
                targetVendorId ? eq(vendorSettlementStatements.vendorId, targetVendorId) : undefined,
                status ? eq(vendorSettlementStatements.status, status) : undefined
            ),
            orderBy: [desc(vendorSettlementStatements.createdAt)],
            with: {
                vendor: true,
                items: {
                    with: { booking: true }
                }
            }
        });

        return NextResponse.json({ statements });
    } catch (e: any) {
        console.error("GET /api/admin/settlements/statements error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
    ]);
    if (error) return error;

    try {
        const body = await req.json();
        const {
            vendorId,
            periodStart,
            periodEnd,
            commissionRate = 15, // Default 15% platform commission
            notes,
        } = body;

        if (!vendorId || !periodStart || !periodEnd) {
            return NextResponse.json({
                error: "vendorId, periodStart, and periodEnd are required."
            }, { status: 400 });
        }

        const vendor = await db.query.vendors.findFirst({
            where: eq(vendors.id, vendorId),
        });

        if (!vendor) {
            return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
        }

        const startDate = new Date(periodStart);
        const endDate = new Date(periodEnd);

        // Fetch vendor's eligible bookings in this window
        const vendorBookings = await db.query.bookings.findMany({
            where: and(
                eq(bookings.vendorId, vendorId),
                inArray(bookings.status, ["approved", "booked", "completed", "on_rent"]),
                gte(bookings.startDate, startDate),
                lte(bookings.startDate, endDate)
            ),
            with: { product: true }
        });

        if (vendorBookings.length === 0) {
            return NextResponse.json({
                error: "No eligible bookings found for this vendor in the selected period."
            }, { status: 400 });
        }

        let grossTotal = 0;
        let commissionTotal = 0;
        let netTotal = 0;

        const calculatedItems = vendorBookings.map(b => {
            const bookingAmount = b.totalPrice || (b.units * (b.product?.pricePerDay || 500));
            const commRate = typeof commissionRate === "number" ? commissionRate : 15;
            const commAmount = bookingAmount * (commRate / 100);
            const earnings = bookingAmount - commAmount;

            grossTotal += bookingAmount;
            commissionTotal += commAmount;
            netTotal += earnings;

            return {
                id: uuid(),
                bookingId: b.id,
                bookingAmount,
                commissionRate: commRate,
                commissionAmount: commAmount,
                vendorEarnings: earnings,
            };
        });

        const statementId = uuid();
        const statementNumber = `VSS-${Date.now().toString(36).toUpperCase()}`;

        const [createdStatement] = await db.insert(vendorSettlementStatements).values({
            id: statementId,
            statementNumber,
            vendorId,
            periodStart: startDate,
            periodEnd: endDate,
            totalBookingsCount: vendorBookings.length,
            grossRentalRevenue: grossTotal,
            platformCommissionTotal: commissionTotal,
            netPayableToVendor: netTotal,
            status: "generated",
            bankName: "Qatar National Bank (QNB)",
            notes: notes || "Standard Monthly Vendor Settlement Run",
        }).returning();

        // Insert line items
        for (const item of calculatedItems) {
            await db.insert(settlementStatementItems).values({
                ...item,
                statementId,
            });
        }

        return NextResponse.json({
            success: true,
            statement: createdStatement,
            itemCount: calculatedItems.length,
            message: `Statement #${statementNumber} generated: Gross QAR ${grossTotal.toLocaleString()}, Net QAR ${netTotal.toLocaleString()}`
        }, { status: 201 });

    } catch (e: any) {
        console.error("POST /api/admin/settlements/statements error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

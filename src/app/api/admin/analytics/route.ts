import { db } from "@/lib/db";
import { bookings, vendorLedgers, products, vendors } from "@/lib/db/schema";
import { eq, and, desc, gte, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { subMonths, startOfMonth, format } from "date-fns";
import { USER_ROLES, BOOKING_STATUS } from "@/lib/constants";

export async function GET(request: Request) {
    const { user, error } = await requireAdmin([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.VENDOR]);
    if (error) return error;

    const isVendor = user.role === USER_ROLES.VENDOR;
    const vendorId = isVendor ? (user as any).vendorId : null;

    // Six months ago for historic charting
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

    try {
        // --- 1. Total Volume / Payouts ---
        let totalLedgersQuery;
        if (isVendor) {
            totalLedgersQuery = await db.select({
                amount: vendorLedgers.amount,
                vendorPayout: vendorLedgers.vendorPayout,
                platformFee: vendorLedgers.platformFee,
                createdAt: vendorLedgers.createdAt
            }).from(vendorLedgers).where(eq(vendorLedgers.vendorId, vendorId));
        } else {
            totalLedgersQuery = await db.select({
                amount: vendorLedgers.amount,
                vendorPayout: vendorLedgers.vendorPayout,
                platformFee: vendorLedgers.platformFee,
                createdAt: vendorLedgers.createdAt
            }).from(vendorLedgers);
        }

        let grossVolume = 0;
        let totalPlatformFee = 0;
        let totalVendorPayout = 0;
        
        const monthlyDataMap: Record<string, any> = {};

        for (let i = 0; i < 6; i++) {
            const m = format(subMonths(new Date(), i), "MMM yyyy");
            monthlyDataMap[m] = { month: m, volume: 0, platformFee: 0, payout: 0 };
        }

        totalLedgersQuery.forEach(ledger => {
            grossVolume += ledger.amount;
            totalPlatformFee += ledger.platformFee;
            totalVendorPayout += ledger.vendorPayout;

            const monthKey = format(new Date(ledger.createdAt), "MMM yyyy");
            if (monthlyDataMap[monthKey]) {
                monthlyDataMap[monthKey].volume += ledger.amount;
                monthlyDataMap[monthKey].platformFee += ledger.platformFee;
                monthlyDataMap[monthKey].payout += ledger.vendorPayout;
            }
        });

        const chartData = Object.values(monthlyDataMap).reverse();

        // --- 2. Quote-to-Book Ratio & Operational Revenue ---
        let allBookingsQuery;
        if (isVendor) {
            allBookingsQuery = await db.select({ 
                status: bookings.status 
            })
            .from(bookings)
            .innerJoin(products, eq(bookings.productId, products.id))
            .where(and(gte(bookings.createdAt, sixMonthsAgo), eq(products.vendorId, vendorId)));
        } else {
            allBookingsQuery = await db.select({ 
                status: bookings.status, 
                logisticsCost: bookings.logisticsCost, 
                laborCost: bookings.laborCost 
            })
            .from(bookings)
            .where(gte(bookings.createdAt, sixMonthsAgo));
        }

        let totalQuotes = 0;
        let totalConverted = 0;
        let operationalRevenue = 0;  // Super admin only

        allBookingsQuery.forEach((b: any) => {
             totalQuotes++;
             if ([BOOKING_STATUS.QUOTE_ACCEPTED, BOOKING_STATUS.APPROVED, BOOKING_STATUS.BOOKED].includes(b.status)) {
                 totalConverted++;
             }
             if (!isVendor) {
                 operationalRevenue += (b.logisticsCost || 0) + (b.laborCost || 0);
             }
        });
        const conversionRate = totalQuotes > 0 ? Math.round((totalConverted / totalQuotes) * 100) : 0;

        // --- 3. Catalog Demand (Most Viewed) ---
        let topProductsQuery;
        if (isVendor) {
             topProductsQuery = await db.query.products.findMany({
                 where: eq(products.vendorId, vendorId),
                 orderBy: [desc(products.viewCount)],
                 limit: 5,
                 columns: { name: true, viewCount: true, itemCode: true }
             });
        } else {
             topProductsQuery = await db.query.products.findMany({
                 orderBy: [desc(products.viewCount)],
                 limit: 5,
                 columns: { name: true, viewCount: true, itemCode: true }
             });
        }

        // --- 4. Future Forecasting (Projected Revenue) ---
        // Sum the projected net for future bookings
        const now = new Date();
        let projectedQuery;

        if (isVendor) {
             projectedQuery = await db.select({ 
                 units: bookings.units, 
                 pricePerDay: products.pricePerDay, 
                 startDate: bookings.startDate, 
                 endDate: bookings.endDate, 
                 commissionRate: vendors.commissionRate 
             })
             .from(bookings)
             .innerJoin(products, eq(bookings.productId, products.id))
             .innerJoin(vendors, eq(products.vendorId, vendors.id))
             .where(and(
                  inArray(bookings.status, [BOOKING_STATUS.QUOTE_ACCEPTED, BOOKING_STATUS.APPROVED, BOOKING_STATUS.BOOKED]),
                  gte(bookings.endDate, now),
                  eq(products.vendorId, vendorId)
             ));
        } else {
             projectedQuery = await db.select({ 
                 units: bookings.units, 
                 pricePerDay: products.pricePerDay, 
                 startDate: bookings.startDate, 
                 endDate: bookings.endDate, 
                 commissionRate: vendors.commissionRate 
             })
             .from(bookings)
             .innerJoin(products, eq(bookings.productId, products.id))
             .innerJoin(vendors, eq(products.vendorId, vendors.id))
             .where(and(
                  inArray(bookings.status, [BOOKING_STATUS.QUOTE_ACCEPTED, BOOKING_STATUS.APPROVED, BOOKING_STATUS.BOOKED]),
                  gte(bookings.endDate, now)
             ));
        }

        let projectedRevenue = 0;
        projectedQuery.forEach(row => {
            const start = new Date(row.startDate);
            const end = new Date(row.endDate);
            const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
            const lineBase = row.pricePerDay * row.units * days;
            const commRate = row.commissionRate || 20;

            if (isVendor) { // Vendor projected payout
                projectedRevenue += lineBase * (1 - (commRate / 100));
            } else { // Platform projected fee
                projectedRevenue += lineBase * (commRate / 100);
            }
        });

        // Additional Platform revenue calculation for Super Admin
        // Add logistics + labor from projected to platform proj revenue
        if (!isVendor) {
            const platformFutureOp = await db.select({
                logisticsCost: bookings.logisticsCost,
                laborCost: bookings.laborCost
            })
            .from(bookings)
            .where(and(
                inArray(bookings.status, [BOOKING_STATUS.QUOTE_ACCEPTED, BOOKING_STATUS.APPROVED, BOOKING_STATUS.BOOKED]),
                gte(bookings.endDate, now)
           ));
           
           platformFutureOp.forEach(op => {
               projectedRevenue += (op.logisticsCost || 0) + (op.laborCost || 0);
           });
        }

        return NextResponse.json({
            grossVolume,
            totalPlatformFee,
            totalVendorPayout,
            conversionRate,
            totalQuotes,
            totalConverted,
            operationalRevenue,
            chartData,
            topProducts: topProductsQuery,
            projectedRevenue
        });

    } catch (error) {
         console.error("Analytics GET Error:", error);
         return NextResponse.json({ error: "Failed to load analytics data" }, { status: 500 });
    }
}

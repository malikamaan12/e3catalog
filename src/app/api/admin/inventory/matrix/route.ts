import { db } from "@/lib/db";
import { products, bookings, inventoryOverrides } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { eq, and, inArray, lte, gte } from "drizzle-orm";
import { format, parseISO, addHours, subHours } from "date-fns";
import { BOOKING_STATUS } from "@/lib/constants";

export async function GET(req: any) {
    try {
        const { searchParams } = new URL(req.url);
        const fromDate = searchParams.get("from");
        const toDate = searchParams.get("to");

        let lookahead = 14;
        let actualStart = fromDate;

        const parseDate = (d: any) => {
            const parsed = new Date(d);
            return isNaN(parsed.getTime()) ? null : parsed;
        };

        if (fromDate && toDate) {
            const start = parseDate(fromDate);
            const end = parseDate(toDate);
            
            if (start && end) {
                const diffTime = Math.abs(end.getTime() - start.getTime());
                lookahead = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                // Cap at 45 days for performance
                if (lookahead > 45) lookahead = 45;

                // Ensure we start from the earlier date if user swapped them
                if (start > end) actualStart = toDate;
            }
        }

        const { user, error } = await requireAdmin(["admin", "super_admin", "sales_rep", "warehouse_manager", "vendor"]);
        if (error) return error;

        const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
        const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

        // Fetch all active products alongside their current unit count
        const allProducts = await db.query.products.findMany({
            where: targetVendorId ? eq(products.vendorId, targetVendorId) : undefined,
            columns: {
                id: true,
                name: true,
                unit: true,
                categoryId: true
            },
            with: {
                category: {
                    columns: { name: true }
                },
                inventoryUnits: {
                    columns: { id: true }
                }
            }
        });

        // Batch calculate timelines optimally in memory
        const productIds = allProducts.map((p) => p.id);
        
        const today = actualStart ? parseDate(actualStart)! : new Date();
        today.setHours(0, 0, 0, 0);

        const endDate = new Date(today);
        endDate.setDate(today.getDate() + lookahead);

        // Map over product IDs but if empty array, query fails in SQL, so bypass
        const allBookings = productIds.length > 0 ? await db.query.bookings.findMany({
            where: and(
                inArray(bookings.productId, productIds),
                inArray(bookings.status, [BOOKING_STATUS.APPROVED, BOOKING_STATUS.BOOKED, BOOKING_STATUS.QUOTE_ACCEPTED, BOOKING_STATUS.BOOKING_REQUESTED]),
                lte(bookings.startDate, endDate),
                gte(bookings.endDate, today)
            ),
        }) : [];

        const allOverrides = productIds.length > 0 ? await db.query.inventoryOverrides.findMany({
            where: and(
                inArray(inventoryOverrides.productId, productIds),
                lte(inventoryOverrides.startDate, endDate),
                gte(inventoryOverrides.endDate, today)
            ),
        }) : [];

        // Group by productID
        const bookingsByProduct = new Map<string, typeof allBookings>();
        const overridesByProduct = new Map<string, typeof allOverrides>();
        
        for (const b of allBookings) {
            const list = bookingsByProduct.get(b.productId) || [];
            list.push(b);
            bookingsByProduct.set(b.productId, list);
        }
        for (const o of allOverrides) {
            const list = overridesByProduct.get(o.productId) || [];
            list.push(o);
            overridesByProduct.set(o.productId, list);
        }

        const matrixData = [];
        for (const product of allProducts) {
            const pBookings = bookingsByProduct.get(product.id) || [];
            const pOverrides = overridesByProduct.get(product.id) || [];
            const totalUnitsCount = product.inventoryUnits.length;
            
            const timeline = [];
            
            for (let i = 0; i < lookahead; i++) {
                const currentDate = new Date(today);
                currentDate.setDate(today.getDate() + i);
                const dateStr = format(currentDate, "yyyy-MM-dd");

                const dayStart = currentDate;
                const dayEnd = addHours(currentDate, 23.99);

                let peakForDay = 0;
                let maintenanceForDay = 0;

                for (const booking of pBookings) {
                    const bStartDate = booking.startDate instanceof Date ? booking.startDate : new Date(booking.startDate);
                    const bEndDate = booking.endDate instanceof Date ? booking.endDate : new Date(booking.endDate);

                    const bookingEffStart = subHours(bStartDate, booking.bufferBefore || 0);
                    const bookingEffEnd = addHours(bEndDate, booking.bufferAfter || 0);

                    if (bookingEffStart <= dayEnd && bookingEffEnd >= dayStart) {
                        peakForDay += booking.units;
                    }
                }

                for (const over of pOverrides) {
                    const oStart = over.startDate instanceof Date ? over.startDate : new Date(over.startDate);
                    const oEnd = over.endDate instanceof Date ? over.endDate : new Date(over.endDate);
                    if (oStart <= dayEnd && oEnd >= dayStart) {
                        maintenanceForDay += over.unitsOffline;
                    }
                }

                const totalBooked = peakForDay + maintenanceForDay;
                const available = Math.max(0, totalUnitsCount - totalBooked);

                timeline.push({
                    date: dateStr,
                    available,
                    booked: peakForDay,
                    maintenance: maintenanceForDay,
                    total: totalUnitsCount,
                });
            }

            matrixData.push({
                product: {
                    id: product.id,
                    name: product.name,
                    totalUnits: totalUnitsCount,
                    unit: product.unit,
                    category: product.category?.name || "Uncategorized"
                },
                timeline
            });
        }

        // Sort alphabetically by product name
        matrixData.sort((a, b) => a.product.name.localeCompare(b.product.name));

        return NextResponse.json(matrixData);
    } catch (matrixError: any) {
        console.error("MATRIX API ERROR [CRITICAL]:", matrixError);
        if (matrixError.stack) console.error(matrixError.stack);
        return NextResponse.json({ error: matrixError.message || "Failed to generate inventory matrix" }, { status: 500 });
    }
}

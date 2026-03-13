import { db } from "@/lib/db";
import { bookings, products, vendors } from "@/lib/db/schema";
import { eq, inArray, gte, lte, and, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

export async function GET(request: Request) {
    try {
        const { user, error } = await requireAdmin(["admin", "super_admin", "sales_rep", "warehouse_manager", "vendor"]);
        if (error) return error;

        // URL Params for filtering by month/year (optional)
        const { searchParams } = new URL(request.url);
        const monthParam = searchParams.get("month"); // YYYY-MM
        
        let startQueryDate = new Date();
        let endQueryDate = new Date();
        
        if (monthParam) {
            const parsed = parseISO(`${monthParam}-01`);
            startQueryDate = startOfMonth(parsed);
            endQueryDate = endOfMonth(parsed);
        } else {
            // Default 30 days back and 60 days forward
            startQueryDate.setDate(startQueryDate.getDate() - 30);
            endQueryDate.setDate(endQueryDate.getDate() + 60);
        }

        const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin' || user.role === 'warehouse_manager';
        const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

        // Build conditions
        const conditions = [
            inArray(bookings.status, ["quote_accepted", "approved", "booked", "booking_requested"]),
            // Booking touches the requested window
            lte(bookings.startDate, endQueryDate),
            gte(bookings.endDate, startQueryDate)
        ];

        // If vendor, restrict view to only their items
        if (!isSuperAdmin && targetVendorId) {
            conditions.push(eq(products.vendorId, targetVendorId));
        }

        const results = await db.select({
            id: bookings.id,
            projectId: bookings.projectId,
            projectName: bookings.projectName,
            status: bookings.status,
            startDate: bookings.startDate,
            endDate: bookings.endDate,
            fulfillmentStatus: bookings.fulfillmentStatus,
            units: bookings.units,
            customerName: bookings.customerName,
            bufferBefore: bookings.bufferBefore,
            bufferAfter: bookings.bufferAfter,
            productName: products.name,
            productItemCode: products.itemCode,
            vendorName: vendors.companyName
        })
        .from(bookings)
        .innerJoin(products, eq(bookings.productId, products.id))
        .leftJoin(vendors, eq(products.vendorId, vendors.id))
        .where(and(...conditions))
        .orderBy(bookings.startDate);

        return NextResponse.json(results);

    } catch (error) {
        console.error("Calendar GET Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

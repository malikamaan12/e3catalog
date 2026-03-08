import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, products } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/requireAdmin";
import { eq, desc } from "drizzle-orm";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { error } = await requireAdmin(["admin", "super_admin", "sales_rep"]);
    if (error) return error;

    try {
        const { id } = await params;
        const userBookings = await db
            .select({
                id: bookings.id,
                projectName: bookings.projectName,
                startDate: bookings.startDate,
                endDate: bookings.endDate,
                status: bookings.status,
                totalPrice: bookings.totalPrice,
                discount: bookings.discount,
                units: bookings.units,
                productName: products.name,
                createdAt: bookings.createdAt
            })
            .from(bookings)
            .innerJoin(products, eq(bookings.productId, products.id))
            .where(eq(bookings.userId, id))
            .orderBy(desc(bookings.createdAt));

        // Aggregate statistics
        let totalLTV = 0;
        let totalDiscount = 0;
        let totalOrders = userBookings.length;
        let completedOrders = 0;

        userBookings.forEach(b => {
            if (b.status === 'booked' || b.status === 'approved') {
                totalLTV += b.totalPrice || 0;
                completedOrders++;
            }
            totalDiscount += b.discount || 0;
        });

        return NextResponse.json({
            history: userBookings,
            stats: {
                totalLTV,
                totalDiscount,
                avgDiscountPerOrder: totalOrders > 0 ? totalDiscount / totalOrders : 0,
                totalOrders,
                completedOrders
            }
        });

    } catch (err) {
        console.error("Error fetching user history:", err);
        return NextResponse.json({ error: "Failed to fetch user history" }, { status: 500 });
    }
}

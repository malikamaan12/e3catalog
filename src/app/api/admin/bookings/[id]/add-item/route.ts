import { db } from "@/lib/db";
import { bookings, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { requireAdmin } from "@/lib/requireAdmin";

// POST /api/admin/bookings/[id]/add-item
// Admin adds a suggested item to an existing quote
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params; // id is the projectId or bookingId of the quote

    try {
        const body = await request.json();
        const { productId, units, startDate, endDate, adminItemNote } = body;

        if (!productId || !units || !startDate || !endDate) {
            return NextResponse.json({ error: "productId, units, startDate, endDate are required" }, { status: 400 });
        }

        // Find the original booking to copy user/project info from
        const originalItems = await db.query.bookings.findMany({
            where: eq(bookings.projectId, id),
        });

        // Fallback: maybe id is a direct booking id (ungrouped)
        const ref = originalItems.length > 0
            ? originalItems[0]
            : await db.query.bookings.findFirst({ where: eq(bookings.id, id) });

        if (!ref) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 });
        }

        // Validate product exists
        const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        const now = new Date();
        const newId = uuid();

        await db.insert(bookings).values({
            id: newId,
            productId,
            vendorId: product.vendorId, // Enforce Tenant Map
            units: Number(units),
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status: ref.status,
            paymentStatus: ref.paymentStatus,
            userId: ref.userId,
            projectId: ref.projectId || ref.id, // group under same project
            projectName: ref.projectName,
            customerName: ref.customerName,
            customerEmail: ref.customerEmail,
            customerPhone: ref.customerPhone,
            addedByAdmin: true,
            adminItemNote: adminItemNote || null,
            createdAt: now,
            updatedAt: now,
        });

        return NextResponse.json({ success: true, id: newId });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

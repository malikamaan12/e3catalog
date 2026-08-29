import { db } from "@/lib/db";
import { bookings, products } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { requireAdmin } from "@/lib/requireAdmin";
import { checkAvailability } from "@/lib/availability";

// POST /api/admin/bookings/[id]/add-item
// Admin adds an item to an existing quote with authoritative stock check
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAdmin(["admin", "super_admin", "sales_rep"]);
    if (error) return error;

    const { id } = await params;

    try {
        const body = await request.json();
        const { productId, units, startDate, endDate, adminItemNote } = body;

        if (!productId || !units || !startDate || !endDate) {
            return NextResponse.json({ error: "productId, units, startDate, endDate are required" }, { status: 400 });
        }

        const requestedUnits = Math.max(1, Number(units) || 1);

        // Find the original booking to copy user/project info from
        const originalItems = await db.query.bookings.findMany({
            where: or(eq(bookings.projectId, id), eq(bookings.id, id)),
        });

        if (!originalItems || originalItems.length === 0) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 });
        }

        const ref = originalItems[0];

        // Check stock availability
        const avail = await checkAvailability({
            productId,
            startDate,
            endDate,
            quantity: requestedUnits,
        });

        if (!avail.available && avail.unitsAvailable < requestedUnits) {
            return NextResponse.json({
                error: `Only ${avail.unitsAvailable} unit${avail.unitsAvailable === 1 ? '' : 's'} available in physical stock.`,
                unitsAvailable: avail.unitsAvailable,
            }, { status: 400 });
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
            vendorId: product.vendorId,
            units: requestedUnits,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status: ref.status,
            paymentStatus: ref.paymentStatus,
            userId: ref.userId,
            projectId: ref.projectId || ref.id,
            projectName: ref.projectName,
            customerName: ref.customerName,
            customerEmail: ref.customerEmail,
            customerPhone: ref.customerPhone,
            discount: ref.discount,
            logisticsCost: ref.logisticsCost,
            laborCost: ref.laborCost,
            paymentTerms: ref.paymentTerms,
            addedByAdmin: true,
            adminItemNote: adminItemNote || null,
            createdAt: now,
            updatedAt: now,
        });

        return NextResponse.json({ success: true, id: newId });
    } catch (e: any) {
        console.error("[ADD_QUOTE_ITEM_ERROR]", e);
        return NextResponse.json({ error: e.message || "Failed to add item" }, { status: 500 });
    }
}

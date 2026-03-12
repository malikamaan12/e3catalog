import { db } from "@/lib/db";
import { bookings, users } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
    const { user, error } = await requireAdmin(["admin", "super_admin", "sales_rep", "warehouse_manager", "vendor"]);
    if (error) return error;

    const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
    const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

    if (!isSuperAdmin && !targetVendorId) {
        return NextResponse.json({ error: "No vendor context assigned." }, { status: 403 });
    }

    const rawBookings = await db.query.bookings.findMany({
        where: targetVendorId ? eq(bookings.vendorId, targetVendorId) : undefined,
        with: {
            product: {
                columns: { name: true, slug: true, thumbnailUrl: true },
            },
        },
        orderBy: (bookings, { desc }) => [desc(bookings.createdAt)],
    }) as any[];
    
    // Fallback: If userId is missing, try to find it via customerEmail
    const missingUserIdEmails = Array.from(new Set(
        rawBookings
            .filter((b: any) => !b.userId && b.customerEmail)
            .map((b: any) => b.customerEmail.toLowerCase())
    )) as string[];

    const emailToIdMap = new Map<string, string>();
    if (missingUserIdEmails.length > 0) {
        const foundUsers = await db.query.users.findMany({
            where: inArray(users.email, missingUserIdEmails),
            columns: { id: true, email: true }
        }) as any[];
        foundUsers.forEach((u: any) => emailToIdMap.set(u.email.toLowerCase(), u.id));
    }

    // Group by projectId if available, otherwise by id
    const grouped = rawBookings.reduce((acc: any, booking: any) => {
        const key = booking.projectId || booking.id;
        if (!acc[key]) {
            acc[key] = {
                id: key, // Use projectId or booking id as the combined ID
                isGrouped: !!booking.projectId,
                projectName: booking.projectName || booking.product.name,
                status: booking.status,
                paymentStatus: booking.paymentStatus,
                customerName: booking.customerName,
                customerEmail: booking.customerEmail,
                customerPhone: booking.customerPhone,
                userId: booking.userId || (booking.customerEmail ? emailToIdMap.get(booking.customerEmail.toLowerCase()) : null),
                startDate: booking.startDate,
                endDate: booking.endDate,
                createdAt: booking.createdAt,
                totalPrice: null, // Will aggregate
                itemsCount: 0,
                // Pick the first item's product info to represent the group visually
                product: {
                    name: booking.projectName || booking.product.name,
                    slug: booking.product.slug,
                    thumbnailUrl: booking.product.thumbnailUrl
                },
                items: []
            };
        }

        acc[key].items.push(booking);
        acc[key].itemsCount += booking.units;

        if (booking.totalPrice) {
            acc[key].totalPrice = (acc[key].totalPrice || 0) + booking.totalPrice;
        }

        return acc;
    }, {});

    const result = Object.values(grouped).sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
    const { user, error } = await requireAdmin(["admin", "super_admin", "sales_rep", "warehouse_manager", "vendor"]);
    if (error) return error;

    const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
    const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

    if (!isSuperAdmin && !targetVendorId) {
        return NextResponse.json({ error: "No vendor context assigned." }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
        return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
    }

    // Vendor Role Verification
    if (!isSuperAdmin) {
        const existing = await db.query.bookings.findFirst({
            where: and(eq(bookings.id, id), eq(bookings.vendorId, targetVendorId))
        });
        if (!existing) {
            return NextResponse.json({ error: "Forbidden: Not authorized to modify this booking." }, { status: 403 });
        }
    }

    updates.updatedAt = new Date().toISOString();
    await db.update(bookings).set(updates).where(eq(bookings.id, id));

    const updated = await db.query.bookings.findFirst({
        where: eq(bookings.id, id),
        with: {
            product: { columns: { name: true, slug: true, thumbnailUrl: true } },
        },
    });

    return NextResponse.json(updated);
}

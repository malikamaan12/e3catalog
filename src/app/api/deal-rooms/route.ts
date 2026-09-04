import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dealRooms, bookings } from "@/lib/db/schema";
import { createOrGetDealRoom } from "@/lib/deal-room";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const rooms = await db
            .select({
                id: dealRooms.id,
                bookingId: dealRooms.bookingId,
                projectName: bookings.projectName,
                customerName: bookings.customerName,
                slug: dealRooms.slug,
                title: dealRooms.title,
                status: dealRooms.status,
                viewCount: dealRooms.viewCount,
                lastViewedAt: dealRooms.lastViewedAt,
                createdAt: dealRooms.createdAt,
            })
            .from(dealRooms)
            .leftJoin(bookings, eq(dealRooms.bookingId, bookings.id))
            .orderBy(desc(dealRooms.createdAt));

        return NextResponse.json({ dealRooms: rooms });
    } catch (err: any) {
        console.error("Deal rooms GET error:", err);
        return NextResponse.json({ error: err.message || "Failed to list deal rooms" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { bookingId, customSlug, title, accessPasscode, branding, allowAmendments } = body;

        if (!bookingId) {
            return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
        }

        const room = await createOrGetDealRoom({
            bookingId,
            customSlug,
            title,
            accessPasscode,
            branding,
            allowAmendments,
        });

        return NextResponse.json({ success: true, dealRoom: room }, { status: 201 });
    } catch (err: any) {
        console.error("Deal rooms POST error:", err);
        return NextResponse.json({ error: err.message || "Failed to create deal room" }, { status: 500 });
    }
}

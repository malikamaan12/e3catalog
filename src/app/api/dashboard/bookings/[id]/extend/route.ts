import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, bookingExtensions, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { validateProjectAvailability } from "@/lib/availability";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { v4 as uuid } from "uuid";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const url = new URL(request.url);
        const daysParam = parseInt(url.searchParams.get("days") || "1", 10);
        const additionalDays = Math.max(1, isNaN(daysParam) ? 1 : daysParam);

        const booking = await db.query.bookings.findFirst({
            where: eq(bookings.id, id),
            with: {
                product: true,
                extensions: {
                    orderBy: (ext, { desc }) => [desc(ext.createdAt)],
                }
            }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        const isOwner = booking.userId === user.id;
        const isStaff = user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN;
        if (!isOwner && !isStaff) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const originalEndDate = new Date(booking.endDate);
        const newEndDate = addDays(originalEndDate, additionalDays);

        // Check availability for the extended window
        const availResult = await validateProjectAvailability([
            {
                productId: booking.productId,
                units: booking.units,
                startDate: originalEndDate,
                endDate: newEndDate,
            }
        ], {
            excludeBookingId: booking.id
        });

        // Calculate rate
        const existingBookingDays = Math.max(1, differenceInCalendarDays(new Date(booking.endDate), new Date(booking.startDate)));
        const dailyRate = booking.product?.pricePerDay || (booking.totalPrice ? Math.round(booking.totalPrice / existingBookingDays / booking.units) : 500);
        const additionalAmount = dailyRate * booking.units * additionalDays;

        return NextResponse.json({
            bookingId: booking.id,
            requestedDays: additionalDays,
            originalEndDate: originalEndDate.toISOString(),
            newEndDate: newEndDate.toISOString(),
            formattedOriginalEndDate: format(originalEndDate, "MMM do, yyyy"),
            formattedNewEndDate: format(newEndDate, "MMM do, yyyy"),
            dailyRate,
            units: booking.units,
            additionalAmount,
            available: availResult.valid,
            conflicts: availResult.conflicts,
            previousExtensions: booking.extensions,
        });

    } catch (e: any) {
        console.error("GET /api/dashboard/bookings/[id]/extend error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { additionalDays: rawDays, reason } = body;

        const additionalDays = parseInt(rawDays, 10);
        if (!additionalDays || additionalDays < 1 || additionalDays > 30) {
            return NextResponse.json({ error: "Please specify valid additional days between 1 and 30." }, { status: 400 });
        }

        const booking = await db.query.bookings.findFirst({
            where: eq(bookings.id, id),
            with: { product: true }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        const isOwner = booking.userId === user.id;
        const isStaff = user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN;
        if (!isOwner && !isStaff) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const originalEndDate = new Date(booking.endDate);
        const newEndDate = addDays(originalEndDate, additionalDays);

        // Real-time stock re-validation
        const availCheck = await validateProjectAvailability([
            {
                productId: booking.productId,
                units: booking.units,
                startDate: originalEndDate,
                endDate: newEndDate,
            }
        ], {
            excludeBookingId: booking.id
        });

        if (!availCheck.valid) {
            return NextResponse.json({
                error: "Equipment availability conflict. Units are already committed for another client in the requested extension window.",
                conflicts: availCheck.conflicts
            }, { status: 409 });
        }

        // Calculate cost
        const existingBookingDays = Math.max(1, differenceInCalendarDays(new Date(booking.endDate), new Date(booking.startDate)));
        const dailyRate = booking.product?.pricePerDay || (booking.totalPrice ? Math.round(booking.totalPrice / existingBookingDays / booking.units) : 500);
        const additionalAmount = dailyRate * booking.units * additionalDays;
        const newTotalPrice = (booking.totalPrice || 0) + additionalAmount;

        // 1. Update Booking
        const [updatedBooking] = await db
            .update(bookings)
            .set({
                endDate: newEndDate,
                totalPrice: newTotalPrice,
                updatedAt: new Date(),
            })
            .where(eq(bookings.id, id))
            .returning();

        // 2. Insert Booking Extension record
        const extensionId = uuid();
        const [extension] = await db
            .insert(bookingExtensions)
            .values({
                id: extensionId,
                bookingId: booking.id,
                requestedDays: additionalDays,
                originalEndDate,
                newEndDate,
                additionalAmount,
                reason: reason || `On-site rental extension for +${additionalDays} days`,
                status: "approved",
                approvedBy: user.id,
            })
            .returning();

        return NextResponse.json({
            success: true,
            message: `Rental successfully extended by +${additionalDays} day(s) until ${format(newEndDate, "MMM do, yyyy")}.`,
            booking: updatedBooking,
            extension,
            additionalAmount,
        }, { status: 201 });

    } catch (e: any) {
        console.error("POST /api/dashboard/bookings/[id]/extend error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

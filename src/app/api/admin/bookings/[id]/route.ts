import { db } from "@/lib/db";
import { bookings, products, notifications, users } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { requireAdmin } from "@/lib/requireAdmin";
import { sendQuoteStatusEmail } from "@/lib/email";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { user, error } = await requireAdmin(["admin", "super_admin", "sales_rep", "warehouse_manager", "vendor"]);
        if (error) return error;

        const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
        const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

        const { id } = await params;
        const bookingItems = await db.query.bookings.findMany({
            where: or(eq(bookings.id, id), eq(bookings.projectId, id)),
            with: {
                product: {
                    columns: { name: true, slug: true, thumbnailUrl: true, pricePerDay: true },
                },
            },
        }) as any[];

        if (!bookingItems || bookingItems.length === 0) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Fallback for userId if missing on booking record
        if (bookingItems.length > 0 && !bookingItems[0].userId && bookingItems[0].customerEmail) {
            const foundUser = await db.query.users.findFirst({
                where: eq(users.email, bookingItems[0].customerEmail.toLowerCase()),
                columns: { id: true }
            });
            if (foundUser) {
                bookingItems.forEach(item => {
                    item.userId = foundUser.id;
                });
            }
        }

        if (!isSuperAdmin) {
            if (bookingItems[0].vendorId !== targetVendorId) {
                return NextResponse.json({ error: "Forbidden: Booking belongs to a different tenant." }, { status: 403 });
            }
        }

        const isGrouped = bookingItems.length > 1 || !!bookingItems[0].projectId;
        const firstItem = bookingItems[0];

        let aggregatedTotalPrice = 0;
        let itemsCount = 0;

        bookingItems.forEach((item) => {
            itemsCount += item.units;
            aggregatedTotalPrice += (item.totalPrice || 0);
        });

        const unifiedBooking = {
            id: isGrouped ? firstItem.projectId : firstItem.id,
            isGrouped,
            projectName: firstItem.projectName || firstItem.product.name,
            status: firstItem.status,
            paymentStatus: firstItem.paymentStatus,
            customerName: firstItem.customerName,
            customerEmail: firstItem.customerEmail,
            customerPhone: firstItem.customerPhone,
            userId: firstItem.userId,
            startDate: firstItem.startDate,
            endDate: firstItem.endDate,
            createdAt: firstItem.createdAt,
            totalPrice: aggregatedTotalPrice,
            itemsCount,
            product: {
                name: firstItem.projectName || firstItem.product.name,
                slug: firstItem.product.slug,
                thumbnailUrl: firstItem.product.thumbnailUrl,
                pricePerDay: firstItem.product.pricePerDay
            },
            items: bookingItems,
            // the form relies on the main project's metadata
            discount: firstItem.discount,
            logisticsCost: firstItem.logisticsCost,
            laborCost: firstItem.laborCost,
            additionalChargeName: firstItem.additionalChargeName,
            additionalChargeAmount: firstItem.additionalChargeAmount,
            additionalChargeType: firstItem.additionalChargeType,
            adminNotes: firstItem.adminNotes,
            selectedTerms: firstItem.selectedTerms,
            paymentTerms: firstItem.paymentTerms,
            paymentMethod: firstItem.paymentMethod,
            customNotes: firstItem.customNotes,
            fulfillmentStatus: firstItem.fulfillmentStatus,
            warehouseNotes: firstItem.warehouseNotes
        };

        return NextResponse.json(unifiedBooking);
    } catch (error) {
        console.error("Booking GET Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { user, error } = await requireAdmin(["admin", "super_admin", "sales_rep", "warehouse_manager", "vendor"]);
        if (error) return error;

        const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
        const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;
        const isWarehouse = user.role === 'warehouse_manager';

        // Check ownership
        if (!isSuperAdmin) {
            const existing = await db.query.bookings.findFirst({
                where: or(eq(bookings.id, id), eq(bookings.projectId, id))
            });
            if (!existing || existing.vendorId !== targetVendorId) {
                return NextResponse.json({ error: "Forbidden: Not authorized to modify this booking." }, { status: 403 });
            }
        }

        const body = await request.json();

        // We allow updating status, pricing offsets, and admin notes
        const {
            status,
            paymentStatus,
            discount,
            logisticsCost,
            laborCost,
            additionalChargeName,
            additionalChargeAmount,
            additionalChargeType,
            adminNotes,
            totalPrice,
            selectedTerms,
            paymentTerms,
            paymentMethod,
            customNotes,
            fulfillmentStatus,
            warehouseNotes
        } = body;

        const updateData: any = {};

        // Only allow non-warehouse roles to update financials
        if (!isWarehouse) {
            if (status !== undefined) updateData.status = status;
            if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
            if (discount !== undefined) updateData.discount = discount;
            if (logisticsCost !== undefined) updateData.logisticsCost = logisticsCost;
            if (laborCost !== undefined) updateData.laborCost = laborCost;
            if (additionalChargeName !== undefined) updateData.additionalChargeName = additionalChargeName;
            if (additionalChargeAmount !== undefined) updateData.additionalChargeAmount = additionalChargeAmount;
            if (additionalChargeType !== undefined) updateData.additionalChargeType = additionalChargeType;
            if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
            if (totalPrice !== undefined) updateData.totalPrice = totalPrice;
            if (selectedTerms !== undefined) updateData.selectedTerms = selectedTerms;
            if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms;
            if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
            if (customNotes !== undefined) updateData.customNotes = customNotes;
        }

        // Available to everyone (including warehouse)
        if (fulfillmentStatus !== undefined) updateData.fulfillmentStatus = fulfillmentStatus;
        if (warehouseNotes !== undefined) updateData.warehouseNotes = warehouseNotes;

        updateData.updatedAt = new Date();

        await db.update(bookings)
            .set(updateData)
            .where(or(eq(bookings.id, id), eq(bookings.projectId, id)));

        // --- Notification Triggers ---
        if (status && ["quote_sent", "approved", "cancelled"].includes(status)) {
            // We need to fetch the booking's userId to send them a notification
            const existingBooking = await db.query.bookings.findFirst({
                where: or(eq(bookings.id, id), eq(bookings.projectId, id)),
            });

            if (existingBooking && existingBooking.userId) {
                let title = "Quote Update";
                let message = `Your request for ${existingBooking.projectName} has been updated.`;

                if (status === "quote_sent") {
                    title = "Quote Ready for Review";
                    message = `Your official quote for ${existingBooking.projectName} is ready for review and acceptance.`;
                } else if (status === "approved") {
                    title = "Booking Approved";
                    message = `Great news! Your booking for ${existingBooking.projectName} has been approved by our team.`;
                } else if (status === "cancelled") {
                    title = "Booking Cancelled";
                    message = `Your request for ${existingBooking.projectName} has been cancelled.`;
                }

                await db.insert(notifications).values({
                    id: uuidv4(),
                    userId: existingBooking.userId,
                    bookingId: existingBooking.projectId || existingBooking.id,
                    title,
                    message,
                    type: status,
                    isRead: false,
                    createdAt: new Date()
                });

                // ── Email Notification ──────────────────────────────────────
                // Fetch the user's email
                if (existingBooking.customerEmail) {
                    await sendQuoteStatusEmail({
                        to: existingBooking.customerEmail,
                        customerName: existingBooking.customerName || "Valued Customer",
                        projectName: existingBooking.projectName || "Your Rental Request",
                        projectId: existingBooking.projectId || existingBooking.id,
                        status,
                        startDate: (existingBooking.startDate instanceof Date) ? existingBooking.startDate.toISOString() : new Date(existingBooking.startDate).toISOString(),
                        endDate: (existingBooking.endDate instanceof Date) ? existingBooking.endDate.toISOString() : new Date(existingBooking.endDate).toISOString(),
                        totalPrice: existingBooking.totalPrice,
                        // Send admin notes to client only when quote is sent
                        adminNote: status === "quote_sent" ? (existingBooking.adminNotes ?? undefined) : undefined,
                    });
                }
                // ─────────────────────────────────────────────────────────
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Booking PATCH Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { user, error } = await requireAdmin(["admin", "super_admin", "sales_rep", "vendor"]);
        if (error) return error;

        const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
        const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

        const { id } = await params;

        // Verify ownership
        if (!isSuperAdmin) {
            const existing = await db.query.bookings.findFirst({
                where: or(eq(bookings.id, id), eq(bookings.projectId, id))
            });
            if (!existing || existing.vendorId !== targetVendorId) {
                return NextResponse.json({ error: "Forbidden: Not authorized to delete this." }, { status: 403 });
            }
        }

        // Delete all booking items for this project (or individual booking)
        await db.delete(bookings)
            .where(or(eq(bookings.id, id), eq(bookings.projectId, id)));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Booking DELETE Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

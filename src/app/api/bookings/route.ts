import { db } from "@/lib/db";
import { bookings, cartItems, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { signToken, getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { v4 as uuid } from "uuid";
import { sendVendorNotificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
    try {
        const sessionId = req.cookies.get("rental_session")?.value;

        if (!sessionId) {
            return NextResponse.json({ error: "No cart session" }, { status: 400 });
        }

        const body = await req.json();
        const { customerName, customerEmail, customerPhone, projectName, notes, projectId } = body;

        if (!customerName || !customerEmail) {
            return NextResponse.json({ error: "Name and Email are required" }, { status: 400 });
        }

        // Fetch cart items
        const items = await db.query.cartItems.findMany({
            where: eq(cartItems.sessionId, sessionId),
            with: {
                product: {
                    with: {
                        vendor: {
                            with: {
                                user: true,
                            },
                        },
                    },
                },
            },
        });

        if (items.length === 0) {
            return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
        }

        // Create a booking record for each item in the cart
        // (In a real system, you might have an 'Orders' table that groups 'Order Items')
        // (But based on the schema, bookings handles individual product reservations)

        // --- Auto-Registration Logic ---
        const normalizedEmail = customerEmail.trim().toLowerCase();
        let targetUserId = "";

        // Check if user is already logged in
        const currentUser = await getCurrentUser();

        if (currentUser) {
            targetUserId = currentUser.id;
        } else {
            // Check if user exists but isn't logged in
            const existingUsers = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

            if (existingUsers.length > 0) {
                // Return 409 Conflict to trigger login prompt on the frontend
                return NextResponse.json({
                    error: "Email is already registered. Please log in to request a quote.",
                    requiresLogin: true
                }, { status: 409 });
            } else {
                // Auto-register new user
                targetUserId = uuid();
                const defaultPassword = customerPhone || "password123"; // Give them a fallback if no phone provided
                await db.insert(users).values({
                    id: targetUserId,
                    name: customerName,
                    email: normalizedEmail,
                    phoneNumber: customerPhone || "",
                    password: defaultPassword,
                    role: "client",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                // Auto-login new user by setting cookie
                const token = await signToken({
                    id: targetUserId,
                    email: normalizedEmail,
                    role: "client",
                });

                const cookieStore = await cookies();
                cookieStore.set("e3_session", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 7 * 24 * 60 * 60, // 7 days
                    path: "/",
                });
            }
        }
        // -------------------------------

        const activeProjectId = projectId || uuid(); // Group all these cart items under one requested quote/project

        let finalProjectName = projectName || "Untitled Project";
        if (projectId) {
            const existingBookings = await db.select().from(bookings).where(eq(bookings.projectId, projectId)).limit(1);
            if (existingBookings.length > 0) {
                finalProjectName = existingBookings[0].projectName || finalProjectName;

                await db.update(bookings)
                    .set({ status: "changes_requested", updatedAt: new Date() })
                    .where(eq(bookings.projectId, projectId));
            }
        }

        // Group items by vendor for grouped processing/notifications
        const groupedByVendor = items.reduce((acc, item) => {
            const vId = item.product.vendorId || "platform";
            if (!acc[vId]) acc[vId] = [];
            acc[vId].push(item);
            return acc;
        }, {} as Record<string, typeof items>);

        // Execute as a single transaction
        await db.transaction(async (tx) => {
            for (const [vendorId, vendorItems] of Object.entries(groupedByVendor)) {
                for (const item of vendorItems) {
                    const bufferBefore = item.product.installTime || 0;
                    const bufferAfter = item.product.dismantleTime || 0;

                    const pkgFee = (item.product.packagingFee || 0) * item.quantity;
                    const hndFee = (item.product.handlingFee || 0) * item.quantity;
                    const setFee = (item.product.setupFee || 0) * item.quantity;
                    const totalCustomFee = pkgFee + hndFee + setFee;

                    await tx.insert(bookings).values({
                        id: uuid(),
                        productId: item.productId,
                        userId: targetUserId,
                        projectId: activeProjectId,
                        projectName: finalProjectName,
                        units: item.quantity,
                        startDate: new Date(item.startDate),
                        endDate: new Date(item.endDate),
                        startTime: item.startTime,
                        endTime: item.endTime,
                        status: "request",
                        bufferBefore,
                        bufferAfter,
                        customerName,
                        customerEmail: normalizedEmail,
                        customerPhone,
                        notes,
                        totalPrice: 0,
                        discount: 0,
                        logisticsCost: 0,
                        additionalChargeName: totalCustomFee > 0 ? "Setup & Handling Fees" : null,
                        additionalChargeAmount: totalCustomFee,
                        additionalChargeType: "fixed",
                        vendorId: item.product.vendorId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                }
            }

            // Clear cart after successful transaction
            await tx.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
        });

        // Trigger notifications after successful database commit
        for (const [vendorId, vendorItems] of Object.entries(groupedByVendor)) {
            const vendor = vendorItems[0].product.vendor;
            const vendorEmail = vendor?.user?.email;
            if (vendorEmail) {
                // We don't await this to keep the response snappy
                sendVendorNotificationEmail({
                    to: vendorEmail,
                    vendorName: vendor.companyName,
                    customerName,
                    projectName: finalProjectName,
                    projectId: activeProjectId,
                }).catch(err => console.error("Vendor notification failed:", err));
            }
        }

        return NextResponse.json({ success: true, message: "Quote requested successfully" });

    } catch (error) {
        console.error("Booking Creation Error:", error);
        return NextResponse.json({ error: "Failed to create quote request" }, { status: 500 });
    }
}

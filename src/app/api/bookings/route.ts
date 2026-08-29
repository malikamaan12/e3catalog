import { db } from "@/lib/db";
import { bookings, cartItems, users, products } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { signToken, getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { v4 as uuid } from "uuid";
import { sendVendorNotificationEmail, sendQuoteStatusEmail } from "@/lib/email";
import { validateProjectAvailability } from "@/lib/availability";
import { calculateQuoteFinancials } from "@/lib/pricing";
import { BOOKING_STATUS } from "@/lib/constants";
import { logStatusTransition } from "@/lib/state-machine";

export async function POST(req: NextRequest) {
    try {
        const sessionId = req.cookies.get("rental_session")?.value;
        const currentUser = await getCurrentUser().catch(() => null);

        if (!sessionId && !currentUser) {
            return NextResponse.json({ error: "No active cart session found" }, { status: 400 });
        }

        const body = await req.json();
        const { customerName, customerEmail, customerPhone, projectName, notes, projectId } = body;

        if (!customerName || !customerEmail) {
            return NextResponse.json({ error: "Name and Email are required to request a quote." }, { status: 400 });
        }

        const normalizedEmail = customerEmail.trim().toLowerCase();

        // 1. Fetch Cart Items
        const whereClause = currentUser?.id
            ? (sessionId ? or(eq(cartItems.sessionId, sessionId), eq(cartItems.userId, currentUser.id)) : eq(cartItems.userId, currentUser.id))
            : eq(cartItems.sessionId, sessionId!);

        const items = await db.query.cartItems.findMany({
            where: whereClause,
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
            return NextResponse.json({ error: "Your proposal cart is empty. Please add items first." }, { status: 400 });
        }

        // 2. Validate Live Availability Atomically for all items
        const availabilityCheck = await validateProjectAvailability(
            items.map(item => ({
                productId: item.productId,
                units: item.quantity,
                startDate: item.startDate,
                endDate: item.endDate,
                startTime: item.startTime || undefined,
                endTime: item.endTime || undefined,
            }))
        );

        if (!availabilityCheck.valid) {
            const conflictMsgs = availabilityCheck.conflicts.map(c => c.error).join(" ");
            return NextResponse.json({
                error: `Availability conflict: ${conflictMsgs}`,
                conflicts: availabilityCheck.conflicts,
            }, { status: 409 });
        }

        // 3. User Resolution / Auto-Registration
        let targetUserId = "";

        if (currentUser) {
            targetUserId = currentUser.id;
        } else {
            // Check if user exists but isn't logged in
            const existingUsers = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

            if (existingUsers.length > 0) {
                return NextResponse.json({
                    error: "An account with this email already exists. Please log in to complete your quote request.",
                    requiresLogin: true,
                }, { status: 409 });
            } else {
                targetUserId = uuid();
                const secureRandomSecret = `e3_${uuid().replace(/-/g, '')}`;
                await db.insert(users).values({
                    id: targetUserId,
                    name: customerName,
                    email: normalizedEmail,
                    phoneNumber: customerPhone || "",
                    password: secureRandomSecret,
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
                    maxAge: 7 * 24 * 60 * 60,
                    path: "/",
                });
            }
        }

        // 4. Project ID and Name Resolution
        const activeProjectId = projectId || uuid();
        let finalProjectName = projectName?.trim() || "Event Production Proposal";

        if (projectId) {
            const existingBookings = await db.select().from(bookings).where(eq(bookings.projectId, projectId)).limit(1);
            if (existingBookings.length > 0) {
                finalProjectName = existingBookings[0].projectName || finalProjectName;
                await db.update(bookings)
                    .set({ status: BOOKING_STATUS.CHANGES_REQUESTED, updatedAt: new Date() })
                    .where(eq(bookings.projectId, projectId));
            }
        }

        // 5. Calculate Deterministic Pricing
        const pricing = calculateQuoteFinancials({
            items: items.map(i => ({
                productId: i.productId,
                name: i.product.name,
                units: i.quantity,
                pricePerDay: i.product.pricePerDay || 0,
                startDate: i.startDate,
                endDate: i.endDate,
                showPrice: i.product.showPrice !== false,
                packagingFee: i.product.packagingFee || 0,
                handlingFee: i.product.handlingFee || 0,
                setupFee: i.product.setupFee || 0,
                vendorId: i.product.vendorId,
            })),
        });

        // 6. Execute Atomic Transaction (Insert Bookings + Clear Cart)
        await db.transaction(async (tx) => {
            for (const item of pricing.items) {
                const rawItem = items.find(i => i.productId === item.productId)!;
                const bufferBefore = rawItem.product.installTime || 0;
                const bufferAfter = rawItem.product.dismantleTime || 0;

                await tx.insert(bookings).values({
                    id: uuid(),
                    productId: item.productId,
                    vendorId: item.vendorId || null,
                    userId: targetUserId,
                    projectId: activeProjectId,
                    projectName: finalProjectName,
                    units: item.units,
                    startDate: rawItem.startDate instanceof Date ? rawItem.startDate : new Date(rawItem.startDate),
                    endDate: rawItem.endDate instanceof Date ? rawItem.endDate : new Date(rawItem.endDate),
                    startTime: rawItem.startTime || null,
                    endTime: rawItem.endTime || null,
                    status: BOOKING_STATUS.REQUEST,
                    paymentStatus: "unpaid",
                    bufferBefore,
                    bufferAfter,
                    customerName,
                    customerEmail: normalizedEmail,
                    customerPhone: customerPhone || null,
                    notes: notes || null,
                    totalPrice: item.rentalTotal,
                    discount: 0,
                    logisticsCost: 0,
                    laborCost: 0,
                    additionalChargeName: item.customFees > 0 ? "Packaging & Setup" : null,
                    additionalChargeAmount: item.customFees,
                    additionalChargeType: "fixed",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }

            // Clear cart items for this session/user
            await tx.delete(cartItems).where(whereClause);
        });

        // 7. Audit log transition
        await logStatusTransition({
            actorId: targetUserId,
            targetId: activeProjectId,
            fromStatus: "cart",
            toStatus: BOOKING_STATUS.REQUEST,
            role: "client",
            details: `Quote requested for project: ${finalProjectName} (${items.length} items)`,
        });

        // 8. Notifications
        const groupedByVendor = items.reduce((acc, item) => {
            const vId = item.product.vendorId || "platform";
            if (!acc[vId]) acc[vId] = [];
            acc[vId].push(item);
            return acc;
        }, {} as Record<string, typeof items>);

        for (const [vendorId, vendorItems] of Object.entries(groupedByVendor)) {
            const vendor = vendorItems[0].product.vendor;
            const vendorEmail = vendor?.user?.email;
            if (vendorEmail) {
                sendVendorNotificationEmail({
                    to: vendorEmail,
                    vendorName: vendor?.companyName || "Vendor Partner",
                    customerName,
                    projectName: finalProjectName,
                    projectId: activeProjectId,
                }).catch(console.error);
            }
        }

        return NextResponse.json({
            success: true,
            projectId: activeProjectId,
            quoteRef: activeProjectId.slice(0, 8).toUpperCase(),
            message: "Quote request established successfully.",
        });
    } catch (err: any) {
        console.error("[BOOKINGS_POST] Error:", err);
        return NextResponse.json(
            { error: "Failed to establish quote: " + (err.message || "Unknown error") },
            { status: 500 }
        );
    }
}

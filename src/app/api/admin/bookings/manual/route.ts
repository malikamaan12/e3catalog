import { db } from "@/lib/db";
import { bookings, users, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
    try {
        const { error } = await requireAdmin(["admin", "super_admin", "vendor", "sales_rep"]);
        if (error) return error;

        const body = await req.json();
        const {
            userId,
            customerName,
            customerEmail,
            customerPhone,
            projectName,
            notes,
            items
        } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "Missing or empty items list" }, { status: 400 });
        }

        let targetUserId = userId;

        // If no userId provided, check if email exists or auto-register
        if (!targetUserId) {
            if (!customerName || !customerEmail) {
                return NextResponse.json({ error: "Client details (Name & Email) are required for new clients" }, { status: 400 });
            }

            const normalizedEmail = customerEmail.trim().toLowerCase();
            const existingUsers = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

            if (existingUsers.length > 0) {
                targetUserId = existingUsers[0].id;
            } else {
                // Auto-register new user
                targetUserId = uuid();
                await db.insert(users).values({
                    id: targetUserId,
                    name: customerName,
                    email: normalizedEmail,
                    phoneNumber: customerPhone || "",
                    password: customerPhone || "password123", // fallback
                    role: "client",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }
        } else {
            // Validate existing user
            const existingUser = await db.query.users.findFirst({
                where: eq(users.id, targetUserId)
            });
            if (!existingUser) {
                return NextResponse.json({ error: "Client not found" }, { status: 404 });
            }
        }

        const projectId = uuid();
        const finalProjectName = projectName || `Admin Booking - ${new Date().toLocaleDateString()}`;

        const bookingPromises = items.map(async (item: any) => {
            // Fetch product to get buffer times and default fees if not provided
            const product = await db.query.products.findFirst({
                where: eq(products.id, item.productId)
            });

            if (!product) {
                throw new Error(`Product ${item.productId} not found`);
            }

            const bufferBefore = product.installTime || 0;
            const bufferAfter = product.dismantleTime || 0;

            await db.insert(bookings).values({
                id: uuid(),
                productId: item.productId,
                vendorId: product.vendorId, // Link to tenant
                userId: targetUserId,
                projectId,
                projectName: finalProjectName,
                units: item.quantity,
                startDate: new Date(item.startDate),
                endDate: new Date(item.endDate),
                startTime: item.startTime || "09:00",
                endTime: item.endTime || "18:00",
                status: "quote_sent", // Admin manual bookings usually skip 'request' and go straight to 'quote_sent'
                bufferBefore,
                bufferAfter,
                customerName: body.customerName || "", // Use provided name for display
                customerEmail: body.customerEmail || "",
                customerPhone: body.customerPhone || "",
                notes: notes || "",
                totalPrice: item.price || 0,
                discount: body.discount || 0,
                logisticsCost: body.logisticsCost || 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        });

        await Promise.all(bookingPromises);

        return NextResponse.json({
            success: true,
            message: "Manual booking created successfully",
            projectId
        });

    } catch (error: any) {
        console.error("Manual Booking Error:", error);
        return NextResponse.json({ error: error.message || "Failed to create manual booking" }, { status: 500 });
    }
}

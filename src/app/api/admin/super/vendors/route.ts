import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
    try {
        const { user: currentUser, error } = await requireAdmin(["super_admin"]);
        if (error) return error;

        // Fetch vendors alongside their admin user
        const vendorList = await db.query.vendors.findMany({
            with: {
                user: {
                    columns: {
                        name: true,
                        email: true,
                        phoneNumber: true,
                        status: true, // active, frozen, blocked
                    }
                }
            },
            orderBy: (vendors, { desc }) => [desc(vendors.createdAt)]
        });

        return NextResponse.json(vendorList);
    } catch (e) {
        console.error("Super Admin Vendors GET Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { user: currentUser, error } = await requireAdmin(["super_admin"]);
        if (error) return error;

        const body = await req.json();
        const { vendorId, kycStatus, storeStatus, userStatus, paymentTerms } = body;

        if (!vendorId) {
            return NextResponse.json({ error: "Vendor ID is required." }, { status: 400 });
        }

        const vendor = await db.query.vendors.findFirst({
            where: eq(vendors.id, vendorId),
            with: { user: true }
        });

        if (!vendor) {
            return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
        }

        // Update User Status (active, frozen, blocked)
        if (userStatus && vendor.userId) {
            await db.update(users)
                .set({
                    status: userStatus,
                    updatedAt: new Date()
                })
                .where(eq(users.id, vendor.userId));
        }

        // Update Vendor details
        const vendorUpdates: any = {};
        if (kycStatus) vendorUpdates.kycStatus = kycStatus; // pending, approved, rejected
        if (storeStatus) vendorUpdates.storeStatus = storeStatus; // active, offline
        if (paymentTerms !== undefined) vendorUpdates.paymentTerms = paymentTerms;

        if (Object.keys(vendorUpdates).length > 0) {
            vendorUpdates.updatedAt = new Date();
            await db.update(vendors)
                .set(vendorUpdates)
                .where(eq(vendors.id, vendorId));
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Super Admin Vendors PATCH Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

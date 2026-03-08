import { db } from "@/lib/db";
import { vendors, users } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { eq } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const id = (await params).id;

        const vendor = await db.query.vendors.findFirst({
            where: eq(vendors.id, id),
            with: {
                user: true // Join the associated user table details
            }
        });

        // Fallback to manual join if relations are not declared perfectly
        if (!vendor) {
            const rawVendorResponse = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
            if (!rawVendorResponse.length) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
            return NextResponse.json({ vendor: rawVendorResponse[0] });
        }

        return NextResponse.json({ vendor });
    } catch (err: any) {
        console.error("GET /api/admin/vendors/[id] error:", err);
        return NextResponse.json({ error: "Failed to fetch vendor details" }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const id = (await params).id;
        const body = await req.json();

        // The fields an Admin is allowed to modify securely
        const { kycStatus, storeStatus, commissionRate, paymentTerms } = body;

        await db.update(vendors)
            .set({
                kycStatus,
                storeStatus,
                commissionRate: commissionRate !== undefined && commissionRate !== "" ? Number(commissionRate) : null,
                paymentTerms
            })
            .where(eq(vendors.id, id));

        // Let's also enforce user statuses conditionally
        if (kycStatus === "approved" && storeStatus === "active") {
            const updatedVendor = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
            if (updatedVendor.length) {
                await db.update(users).set({ status: "active" }).where(eq(users.id, updatedVendor[0].userId));
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("PUT /api/admin/vendors/[id] error:", err);
        return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
    }
}

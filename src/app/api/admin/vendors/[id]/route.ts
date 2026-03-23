import { db } from "@/lib/db";
import { vendors, users } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { eq } from "drizzle-orm";
import { logAuditAction } from "@/lib/auditLogger";

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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { error, user: currentAdmin } = await requireAdmin();
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

        // The "Role Flip": Upgrade user to vendor role when KYC is approved
        if (kycStatus === "approved") {
            const currentVendor = await db.select({ userId: vendors.userId }).from(vendors).where(eq(vendors.id, id)).limit(1);
            if (currentVendor.length && currentVendor[0].userId) {
                await db.update(users)
                    .set({ 
                        role: "vendor",
                        status: "active" 
                    })
                    .where(eq(users.id, currentVendor[0].userId));
                console.log("ADMIN ACTION: Vendor KYC Approved. User role upgraded to 'vendor' for ID:", currentVendor[0].userId);
            }
        }

        // Log the audit action
        await logAuditAction({
            adminId: currentAdmin?.id || 'system',
            action: kycStatus === 'approved' ? 'approve_kyc' : (kycStatus === 'rejected' ? 'reject_kyc' : 'update_vendor'),
            targetId: id,
            targetType: 'vendor',
            details: { kycStatus, storeStatus, commissionRate, paymentTerms }
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("PATCH /api/admin/vendors/[id] error:", err);
        return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
    }
}

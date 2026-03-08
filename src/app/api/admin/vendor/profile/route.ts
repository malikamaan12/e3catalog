import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
    try {
        const { user, error } = await requireAdmin(["vendor", "super_admin", "admin"]);
        if (error) return error;

        const targetVendorId = (user as any).vendorId;

        if (!targetVendorId) {
            return NextResponse.json({ error: "User is not associated with a vendor." }, { status: 403 });
        }

        const vendorProfile = await db.query.vendors.findFirst({
            where: eq(vendors.id, targetVendorId)
        });

        if (!vendorProfile) {
            return NextResponse.json({ error: "Vendor profile not found." }, { status: 404 });
        }

        return NextResponse.json(vendorProfile);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { user, error } = await requireAdmin(["vendor", "admin", "super_admin"]);
        if (error) return error;

        const targetVendorId = (user as any).vendorId;

        if (!targetVendorId) {
            return NextResponse.json({ error: "No vendor profile associated. Admins must use the vendor management page." }, { status: 403 });
        }

        const body = await req.json();

        // Prevent vendors from updating critical properties that super admins manage
        const {
            id,
            userId,
            kycStatus,
            agreementStatus,
            commissionRate,
            paymentTerms,
            storeStatus,
            scoreDelivery,
            scoreCondition,
            scoreRating,
            createdAt,
            // Only allow updates to fields below:
            companyName,
            website,
            pocName,
            pocPhone,
            alternatePocName,
            alternatePocPhone,
            logoUrl,
            bankName,
            accountName,
            accountNumber,
            iban,
            swift,
            ...rest
        } = body;

        const updates = {
            companyName,
            website,
            pocName,
            pocPhone,
            alternatePocName,
            alternatePocPhone,
            logoUrl,
            bankName,
            accountName,
            accountNumber,
            iban,
            swift,
            updatedAt: new Date()
        };

        // Remove undefined fields
        Object.keys(updates).forEach(key => updates[key as keyof typeof updates] === undefined && delete updates[key as keyof typeof updates]);

        await db.update(vendors).set(updates).where(eq(vendors.id, targetVendorId));

        const updatedProfile = await db.query.vendors.findFirst({
            where: eq(vendors.id, targetVendorId)
        });

        return NextResponse.json(updatedProfile);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

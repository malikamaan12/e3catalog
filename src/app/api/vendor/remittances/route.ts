import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendorRemittances } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { recordVendorRemittance } from "@/lib/invoicing";

export async function GET(req: NextRequest) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const isStaff = user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN;
        const isVendor = user.role === USER_ROLES.VENDOR;

        if (!isStaff && !isVendor) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const url = new URL(req.url);
        const vendorId = url.searchParams.get("vendorId");

        const remittances = await db.query.vendorRemittances.findMany({
            where: vendorId ? eq(vendorRemittances.vendorId, vendorId) : undefined,
            with: {
                vendor: true,
                booking: true,
                verifier: true,
            },
            orderBy: [desc(vendorRemittances.createdAt)],
        });

        return NextResponse.json({ remittances });
    } catch (e: any) {
        console.error("Vendor Remittances GET Error:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { vendorId, bookingId, amountCollected, platformCommissionOwed, remittanceEvidenceUrl, notes } = body;

        if (!vendorId || !bookingId || !amountCollected || !platformCommissionOwed) {
            return NextResponse.json({ 
                error: "Missing required fields: vendorId, bookingId, amountCollected, platformCommissionOwed" 
            }, { status: 400 });
        }

        const result = await recordVendorRemittance({
            vendorId,
            bookingId,
            amountCollected: Number(amountCollected),
            platformCommissionOwed: Number(platformCommissionOwed),
            remittanceEvidenceUrl,
            notes,
        });

        return NextResponse.json(result, { status: 201 });
    } catch (e: any) {
        console.error("Vendor Remittance POST Error:", e);
        return NextResponse.json({ error: e.message || "Failed to record vendor remittance" }, { status: 500 });
    }
}

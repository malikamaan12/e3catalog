import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
    try {
        const user = await getCurrentUser().catch(() => null);
        if (!user) {
            return NextResponse.json({ user: null });
        }

        let kycStatus = null;
        let vendorId = (user as any).vendorId || null;

        if (vendorId) {
            try {
                const vendorRecords = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
                if (vendorRecords.length > 0) {
                    kycStatus = vendorRecords[0].kycStatus;
                }
            } catch (vErr) {
                console.error("Auth Me Vendor Fetch Error:", vErr);
            }
        }

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                vendorId: vendorId,
                kycStatus: kycStatus,
                image: (user as any).image || ""
            }
        });
    } catch (err: any) {
        console.error("AUTH ME FATAL ERROR:", err);
        return NextResponse.json({ user: null });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        // Only super_admin can configure commission matrices.
        const { user, error } = await requireAdmin(["super_admin"]);
        if (error) return error;

        const resolvedParams = await params;
        const vendorId = resolvedParams.id;
        
        const body = await req.json();
        const { commissionType, commissionValue } = body;

        const allowedTypes = ["percentage", "fixed_per_item", "per_project_fee", "fixed_monthly"];
        
        if (!commissionType || !allowedTypes.includes(commissionType)) {
            return NextResponse.json({ error: "Invalid commission type." }, { status: 400 });
        }

        if (commissionValue === undefined || isNaN(Number(commissionValue))) {
            return NextResponse.json({ error: "Invalid commission value." }, { status: 400 });
        }

        const numericValue = Number(commissionValue);

        await db.update(vendors)
            .set({ 
                commissionType, 
                commissionValue: numericValue,
                updatedAt: new Date(),
            })
            .where(eq(vendors.id, vendorId));

        return NextResponse.json({ success: true, commissionType, commissionValue: numericValue });

    } catch (err: any) {
        console.error("Failed to update commission rules:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

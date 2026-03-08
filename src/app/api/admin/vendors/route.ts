import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { desc } from "drizzle-orm";

export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const allVendors = await db
            .select()
            .from(vendors)
            .orderBy(desc(vendors.createdAt));

        return NextResponse.json({ vendors: allVendors });
    } catch (err: any) {
        console.error("GET /api/admin/vendors error:", err);
        return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
    }
}

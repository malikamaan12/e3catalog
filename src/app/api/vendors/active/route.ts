import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const activeVendors = await db
            .select({
                id: vendors.id,
                companyName: vendors.companyName,
            })
            .from(vendors)
            .where(eq(vendors.storeStatus, "active"))
            .orderBy(vendors.companyName);

        return NextResponse.json(activeVendors);
    } catch (e) {
        console.error("Error fetching active vendors:", e);
        return NextResponse.json([], { status: 500 });
    }
}

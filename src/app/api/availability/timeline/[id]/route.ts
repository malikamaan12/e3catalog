import { db } from "@/lib/db";
import { getAvailabilityTimeline } from "@/lib/availability";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const product = await db.query.products.findFirst({
        where: eq(products.id, id),
    });

    if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const timeline = await getAvailabilityTimeline(id, 30);
    return NextResponse.json(timeline);
}

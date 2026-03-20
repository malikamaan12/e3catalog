import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Fetch all active categories
        const all = await db.query.categories.findMany({
            where: eq(categories.active, true),
        });

        // Build hierarchy: parents first, then nest children
        const parents = all
            .filter((c) => !c.parentId)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        const tree = parents.map((parent) => ({
            ...parent,
            children: all
                .filter((c) => c.parentId === parent.id)
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
        }));

        // Also return a flat list for backwards compatibility
        return NextResponse.json({ tree, flat: all }, {
            headers: {
                "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            },
        });
    } catch (e) {
        console.error("Error fetching categories:", e);
        return NextResponse.json({ tree: [], flat: [] });
    }
}

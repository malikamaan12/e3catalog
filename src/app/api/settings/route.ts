import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export const revalidate = 60; // Cache for 60 seconds (ISR)
// export const dynamic = "force-dynamic"; // Removed to allow caching

export async function GET() {
    try {
        // Define non-sensitive settings that are safe for public consumption
        const publicGroups = ["general", "theme", "contact", "links", "features"];

        const allSettings = await db
            .select()
            .from(siteSettings)
            .where(inArray(siteSettings.group, publicGroups));

        return NextResponse.json(allSettings, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
        });
    } catch (err) {
        console.error("Error fetching public settings:", err);
        // RECOVERY: Return empty array to prevent frontend .filter() crashes
        return NextResponse.json([]);
    }
}

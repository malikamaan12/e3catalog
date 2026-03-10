import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // Define non-sensitive settings that are safe for public consumption
        const publicGroups = ["general", "theme", "contact", "links", "features"];

        const allSettings = await db
            .select()
            .from(siteSettings)
            .where(inArray(siteSettings.group, publicGroups));

        return NextResponse.json(allSettings);
    } catch (err) {
        console.error("Error fetching public settings:", err);
        // RECOVERY: Return empty array to prevent frontend .filter() crashes
        return NextResponse.json([]);
    }
}

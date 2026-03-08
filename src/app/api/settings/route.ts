import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";

export async function GET() {
    try {
        // Fetch all settings
        // Exclude sensitive API keys from public consumption
        const allSettings = await db
            .select()
            .from(siteSettings);

        // Filter out sensitive groups
        const safeSettings = allSettings.filter(s => s.group !== 'api');

        return NextResponse.json(safeSettings);
    } catch (err) {
        console.error("Error fetching public settings:", err);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

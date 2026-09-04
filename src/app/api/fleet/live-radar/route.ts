import { NextRequest, NextResponse } from "next/server";
import { getLiveFleetRadarFeed } from "@/lib/telemetry-gps";

export async function GET(req: NextRequest) {
    try {
        const feed = await getLiveFleetRadarFeed();
        return NextResponse.json(feed);
    } catch (err: any) {
        console.error("Live fleet radar error:", err);
        return NextResponse.json({ error: err.message || "Failed to load radar feed" }, { status: 500 });
    }
}

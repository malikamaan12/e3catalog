import { NextRequest, NextResponse } from "next/server";
import { ingestDriverTelemetryPing } from "@/lib/telemetry-gps";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = await ingestDriverTelemetryPing(body);
        return NextResponse.json({ success: true, telemetry: result });
    } catch (err: any) {
        console.error("Driver GPS stream error:", err);
        return NextResponse.json({ error: err.message || "Failed to process telemetry ping" }, { status: 500 });
    }
}

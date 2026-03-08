import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        status: "ok",
        version: "2026-03-09-v2",
        timestamp: new Date().toISOString()
    });
}

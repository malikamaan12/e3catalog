import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { checkCrossDockOpportunity, fastTrackCrossDock } from "@/lib/warehouse/cross-dock-engine";

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "super_admin", "vendor", "warehouse_manager"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get("identifier");

    if (!identifier) {
        return NextResponse.json({ error: "Identifier query parameter is required" }, { status: 400 });
    }

    try {
        const result = await checkCrossDockOpportunity(identifier);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Cross-dock check error:", error);
        return NextResponse.json({ error: error.message || "Failed to check cross-dock" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "super_admin", "vendor", "warehouse_manager"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { unitId, bookingId, stagingBay } = body;

        if (!unitId || !bookingId) {
            return NextResponse.json({ error: "unitId and bookingId are required" }, { status: 400 });
        }

        const result = await fastTrackCrossDock(unitId, bookingId, stagingBay);
        if (!result.success) {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Cross-dock execute error:", error);
        return NextResponse.json({ error: error.message || "Failed to execute cross-dock" }, { status: 500 });
    }
}

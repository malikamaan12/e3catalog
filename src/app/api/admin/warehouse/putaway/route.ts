import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recommendPutawayBin, confirmPutaway } from "@/lib/warehouse/putaway-engine";

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "super_admin", "vendor", "warehouse_manager"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get("identifier");

    if (!identifier) {
        return NextResponse.json({ error: "Identifier parameter is required" }, { status: 400 });
    }

    try {
        const result = await recommendPutawayBin(identifier);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Putaway recommendation error:", error);
        return NextResponse.json({ error: error.message || "Failed to recommend putaway bin" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "super_admin", "vendor", "warehouse_manager"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { identifier, binCode } = body;

        if (!identifier || !binCode) {
            return NextResponse.json({ error: "Both identifier and binCode are required" }, { status: 400 });
        }

        const result = await confirmPutaway(identifier, binCode);
        if (!result.success) {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Putaway confirmation error:", error);
        return NextResponse.json({ error: error.message || "Failed to confirm putaway" }, { status: 500 });
    }
}

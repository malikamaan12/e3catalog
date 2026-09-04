import { NextRequest, NextResponse } from "next/server";
import { getFlightCaseManifest } from "@/lib/kit-assemblies";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await props.params;
        const manifest = await getFlightCaseManifest(id);
        if (!manifest) {
            return NextResponse.json({ error: "Flight case not found" }, { status: 404 });
        }
        return NextResponse.json({ flightCase: manifest });
    } catch (err: any) {
        console.error("Flight case detail error:", err);
        return NextResponse.json({ error: err.message || "Failed to load flight case" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { verifyFlightCasePack, verifyFlightCaseReturn } from "@/lib/kit-assemblies";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await props.params;
        const body = await req.json();
        const { mode = "pack", scannedTags = [], bookingId, verifiedBy } = body;

        if (mode === "return_audit") {
            const result = await verifyFlightCaseReturn({
                flightCaseId: id,
                returnedTags: scannedTags,
                bookingId,
                filedBy: verifiedBy,
            });
            return NextResponse.json({ success: true, result });
        } else {
            const result = await verifyFlightCasePack({
                flightCaseId: id,
                scannedTags,
                verifiedBy,
            });
            return NextResponse.json({ success: true, result });
        }
    } catch (err: any) {
        console.error("Flight case verify error:", err);
        return NextResponse.json({ error: err.message || "Failed to verify flight case" }, { status: 500 });
    }
}

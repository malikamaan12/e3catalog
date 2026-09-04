import { NextRequest, NextResponse } from "next/server";
import { generateBookingCallSheet } from "@/lib/crew-scheduling";

export async function GET(req: NextRequest, props: { params: Promise<{ bookingId: string }> }) {
    try {
        const { bookingId } = await props.params;
        const callSheet = await generateBookingCallSheet(bookingId);
        return NextResponse.json(callSheet);
    } catch (err: any) {
        console.error("Call sheet GET error:", err);
        return NextResponse.json({ error: err.message || "Failed to generate call sheet" }, { status: 500 });
    }
}

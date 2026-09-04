import { NextRequest, NextResponse } from "next/server";
import { recordCrewTimesheet } from "@/lib/crew-scheduling";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await props.params;
        const body = await req.json();

        const result = await recordCrewTimesheet(id, {
            checkInAt: body.checkInAt ? new Date(body.checkInAt) : undefined,
            checkOutAt: body.checkOutAt ? new Date(body.checkOutAt) : undefined,
            status: body.status,
            notes: body.notes,
        });

        return NextResponse.json({ success: true, timesheet: result });
    } catch (err: any) {
        console.error("Crew timesheet error:", err);
        return NextResponse.json({ error: err.message || "Failed to process timesheet" }, { status: 500 });
    }
}

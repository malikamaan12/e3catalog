import { NextRequest, NextResponse } from "next/server";
import { submitDealRoomAmendment } from "@/lib/deal-room";
import { db } from "@/lib/db";
import { dealRoomAmendments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await props.params;
        const body = await req.json();
        const { requestedChanges, proposedSubtotal, clientComment } = body;

        if (!requestedChanges || !Array.isArray(requestedChanges)) {
            return NextResponse.json({ error: "requestedChanges must be an array" }, { status: 400 });
        }

        const result = await submitDealRoomAmendment({
            slug,
            requestedChanges,
            proposedSubtotal,
            clientComment,
        });

        return NextResponse.json(result, { status: 201 });
    } catch (err: any) {
        console.error("Deal room amendment POST error:", err);
        return NextResponse.json({ error: err.message || "Failed to submit amendment" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { amendmentId, status, adminNotes } = body;

        if (!amendmentId || !status) {
            return NextResponse.json({ error: "Missing amendmentId or status" }, { status: 400 });
        }

        await db
            .update(dealRoomAmendments)
            .set({
                status,
                adminNotes: adminNotes || null,
                reviewedAt: new Date(),
            })
            .where(eq(dealRoomAmendments.id, amendmentId));

        return NextResponse.json({ success: true, amendmentId, status });
    } catch (err: any) {
        console.error("Deal room amendment PATCH error:", err);
        return NextResponse.json({ error: err.message || "Failed to review amendment" }, { status: 500 });
    }
}

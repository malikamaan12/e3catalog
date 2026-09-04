import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kitMissingItemClaims, flightCases, bookings } from "@/lib/db/schema";
import { resolveMissingItemClaim } from "@/lib/kit-assemblies";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const claims = await db
            .select({
                id: kitMissingItemClaims.id,
                bookingId: kitMissingItemClaims.bookingId,
                projectName: bookings.projectName,
                flightCaseId: kitMissingItemClaims.flightCaseId,
                caseNumber: flightCases.caseNumber,
                itemName: kitMissingItemClaims.itemName,
                penaltyFee: kitMissingItemClaims.penaltyFee,
                status: kitMissingItemClaims.status,
                claimNotes: kitMissingItemClaims.claimNotes,
                resolvedAt: kitMissingItemClaims.resolvedAt,
                createdAt: kitMissingItemClaims.createdAt,
            })
            .from(kitMissingItemClaims)
            .leftJoin(flightCases, eq(kitMissingItemClaims.flightCaseId, flightCases.id))
            .leftJoin(bookings, eq(kitMissingItemClaims.bookingId, bookings.id))
            .orderBy(desc(kitMissingItemClaims.createdAt));

        return NextResponse.json({ claims });
    } catch (err: any) {
        console.error("Kit missing claims error:", err);
        return NextResponse.json({ error: err.message || "Failed to list missing item claims" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { claimId, action, notes } = body;
        if (!claimId || !action) {
            return NextResponse.json({ error: "Missing claimId or action" }, { status: 400 });
        }

        const result = await resolveMissingItemClaim(claimId, { action, notes });
        return NextResponse.json({ success: true, result });
    } catch (err: any) {
        console.error("Resolve claim error:", err);
        return NextResponse.json({ error: err.message || "Failed to resolve claim" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { flightCases, flightCaseContents } from "@/lib/db/schema";
import { createFlightCase, assignCaseContents } from "@/lib/kit-assemblies";
import { desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const cases = await db
            .select({
                id: flightCases.id,
                caseNumber: flightCases.caseNumber,
                name: flightCases.name,
                caseType: flightCases.caseType,
                assetTagCode: flightCases.assetTagCode,
                rfidTag: flightCases.rfidTag,
                tareWeightKg: flightCases.tareWeightKg,
                maxCapacityKg: flightCases.maxCapacityKg,
                status: flightCases.status,
                warehouseLocation: flightCases.warehouseLocation,
                notes: flightCases.notes,
                itemCount: sql<number>`(SELECT count(*) FROM ${flightCaseContents} WHERE ${flightCaseContents.flightCaseId} = ${flightCases.id})`,
                createdAt: flightCases.createdAt,
            })
            .from(flightCases)
            .orderBy(desc(flightCases.createdAt));

        return NextResponse.json({ flightCases: cases });
    } catch (err: any) {
        console.error("Flight cases GET error:", err);
        return NextResponse.json({ error: err.message || "Failed to list flight cases" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const created = await createFlightCase(body);

        if (body.initialContents && Array.isArray(body.initialContents)) {
            await assignCaseContents(created.id, body.initialContents);
        }

        return NextResponse.json({ success: true, flightCase: created }, { status: 201 });
    } catch (err: any) {
        console.error("Flight cases POST error:", err);
        return NextResponse.json({ error: err.message || "Failed to create flight case" }, { status: 500 });
    }
}

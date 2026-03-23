import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inspectionLogs, inventoryUnits, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getSession } from "@/lib/auth";

// POST — Create a new inspection log
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "super_admin", "vendor", "warehouse_manager"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { unitId, inspectionType, conditionBefore, conditionAfter, notes } = body;

        if (!unitId || !inspectionType || !conditionBefore || !conditionAfter) {
            return NextResponse.json({ error: "unitId, inspectionType, conditionBefore, and conditionAfter are required" }, { status: 400 });
        }

        // 1. Create the inspection log
        const log = await db.insert(inspectionLogs).values({
            id: uuidv4(),
            unitId,
            inspectorId: session.id,
            inspectionType,
            conditionBefore,
            conditionAfter,
            notes: notes || null,
            createdAt: new Date(),
        }).returning();

        // 2. Update the unit's condition and last inspection date
        await db.update(inventoryUnits)
            .set({
                conditionStatus: conditionAfter,
                lastInspectionDate: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(inventoryUnits.id, unitId));

        return NextResponse.json(log[0], { status: 201 });
    } catch (error) {
        console.error("Inspection Log Error:", error);
        return NextResponse.json({ error: "Failed to log inspection" }, { status: 500 });
    }
}

// GET — Fetch inspection history for a unit
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const unitId = searchParams.get("unitId");

        if (!unitId) {
            return NextResponse.json({ error: "unitId query param required" }, { status: 400 });
        }

        const logs = await db.select({
            id: inspectionLogs.id,
            unitId: inspectionLogs.unitId,
            inspectorId: inspectionLogs.inspectorId,
            inspectorName: users.name,
            inspectionType: inspectionLogs.inspectionType,
            conditionBefore: inspectionLogs.conditionBefore,
            conditionAfter: inspectionLogs.conditionAfter,
            notes: inspectionLogs.notes,
            createdAt: inspectionLogs.createdAt,
        })
        .from(inspectionLogs)
        .leftJoin(users, eq(inspectionLogs.inspectorId, users.id))
        .where(eq(inspectionLogs.unitId, unitId))
        .orderBy(desc(inspectionLogs.createdAt))
        .limit(50)
        .execute();

        return NextResponse.json(logs);
    } catch (error) {
        console.error("Inspection History Error:", error);
        return NextResponse.json({ error: "Failed to fetch inspection history" }, { status: 500 });
    }
}

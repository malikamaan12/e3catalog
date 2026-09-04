import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryUnits, maintenanceWorkOrders, bookingUnitAssignments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ assetTag: string }> }
) {
    const { assetTag } = await context.params;

    try {
        const body = await req.json();
        const { issueType = "equipment_fault", description, severity = "urgent", contactPhone } = body;

        if (!description?.trim()) {
            return NextResponse.json({ error: "Fault description is required." }, { status: 400 });
        }

        const unit = await db.query.inventoryUnits.findFirst({
            where: eq(inventoryUnits.assetTagCode, assetTag),
            with: { product: true },
        });

        if (!unit) {
            return NextResponse.json({ error: "Inventory unit not found." }, { status: 404 });
        }

        const woNumber = `WO-INC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
        const woId = uuid();

        await db.insert(maintenanceWorkOrders).values({
            id: woId,
            workOrderNumber: woNumber,
            unitId: unit.id,
            priority: severity === "urgent" ? "urgent" : "high",
            status: "open",
            reportedIssue: `[ON-SITE RAPID TICKET] ${issueType.toUpperCase()}: ${description} (Contact: ${contactPhone || "On-site tech"})`,
            technicianName: "On-Site Response Team",
            laborHours: 0,
            laborRatePerHour: 50,
            totalPartsCost: 0,
            totalRepairCost: 0,
        });

        await db.update(inventoryUnits)
            .set({
                conditionStatus: "maintenance_required",
                updatedAt: new Date(),
            })
            .where(eq(inventoryUnits.id, unit.id));

        return NextResponse.json({
            success: true,
            message: "Incident logged. On-site rapid replacement work order dispatched!",
            workOrderNumber: woNumber,
        });
    } catch (e: any) {
        console.error("POST /api/passport/[assetTag]/incident error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

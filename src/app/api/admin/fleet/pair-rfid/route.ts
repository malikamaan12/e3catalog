import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryUnits, flightCases, products } from "@/lib/db/schema";
import { eq, or, and, not } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "super_admin", "vendor", "warehouse_manager"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("query")?.trim().toUpperCase();

        if (!query) {
            return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
        }

        // Check if query matches an RFID EPC or Asset Tag or Serial Number
        const unit = await db.query.inventoryUnits.findFirst({
            where: or(
                eq(inventoryUnits.rfidTag, query),
                eq(inventoryUnits.assetTagCode, query),
                eq(inventoryUnits.serialNumber, query),
                eq(inventoryUnits.id, query)
            ),
            with: {
                product: true,
            },
        });

        if (unit) {
            return NextResponse.json({
                found: true,
                type: "unit",
                id: unit.id,
                identifier: unit.assetTagCode,
                rfidTag: unit.rfidTag,
                name: unit.product?.name || "Equipment Unit",
                serialNumber: unit.serialNumber,
                status: unit.availabilityStatus,
                shelfLocation: unit.shelfLocation,
            });
        }

        const flightCase = await db.query.flightCases.findFirst({
            where: or(
                eq(flightCases.rfidTag, query),
                eq(flightCases.caseNumber, query),
                eq(flightCases.assetTagCode, query),
                eq(flightCases.id, query)
            ),
        });

        if (flightCase) {
            return NextResponse.json({
                found: true,
                type: "flight_case",
                id: flightCase.id,
                identifier: flightCase.caseNumber,
                rfidTag: flightCase.rfidTag,
                name: flightCase.name,
                status: flightCase.status,
                warehouseLocation: flightCase.warehouseLocation,
            });
        }

        return NextResponse.json({
            found: false,
            message: `No active asset or flight case found with code or RFID "${query}".`,
        });
    } catch (error: any) {
        console.error("RFID Lookup Error:", error);
        return NextResponse.json({ error: error.message || "Failed to inspect RFID tag" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "super_admin", "vendor", "warehouse_manager"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { identifier, rfidTag, action } = body;

        if (!identifier) {
            return NextResponse.json({ error: "Identifier (Asset Tag / Unit ID / Case Number) is required." }, { status: 400 });
        }

        const cleanIdentifier = identifier.trim().toUpperCase();
        const isUnpair = action === "unpair" || rfidTag === "" || rfidTag === null;
        const cleanRfid = isUnpair ? null : rfidTag.trim().toUpperCase();

        // 1. Locate target unit or flight case
        const unit = await db.query.inventoryUnits.findFirst({
            where: or(
                eq(inventoryUnits.assetTagCode, cleanIdentifier),
                eq(inventoryUnits.id, identifier),
                eq(inventoryUnits.serialNumber, cleanIdentifier)
            ),
            with: {
                product: true,
            },
        });

        const flightCase = !unit ? await db.query.flightCases.findFirst({
            where: or(
                eq(flightCases.caseNumber, cleanIdentifier),
                eq(flightCases.assetTagCode, cleanIdentifier),
                eq(flightCases.id, identifier)
            )
        }) : null;

        if (!unit && !flightCase) {
            return NextResponse.json({ error: `Asset unit or Flight Case matching "${identifier}" not found.` }, { status: 404 });
        }

        // If assigning a new RFID tag, verify it is not already used
        if (cleanRfid) {
            // Check collision with inventory units
            const existingUnitWithRfid = await db.query.inventoryUnits.findFirst({
                where: and(
                    eq(inventoryUnits.rfidTag, cleanRfid),
                    unit ? not(eq(inventoryUnits.id, unit.id)) : undefined
                ),
                with: { product: true }
            });

            if (existingUnitWithRfid) {
                return NextResponse.json({ 
                    error: `RFID tag ${cleanRfid} is already assigned to asset "${existingUnitWithRfid.assetTagCode}" (${existingUnitWithRfid.product?.name || "Equipment"}). Please unpair it first or use a distinct tag.` 
                }, { status: 409 });
            }

            // Check collision with flight cases
            const existingCaseWithRfid = await db.query.flightCases.findFirst({
                where: and(
                    eq(flightCases.rfidTag, cleanRfid),
                    flightCase ? not(eq(flightCases.id, flightCase.id)) : undefined
                )
            });

            if (existingCaseWithRfid) {
                return NextResponse.json({ 
                    error: `RFID tag ${cleanRfid} is already assigned to flight case "${existingCaseWithRfid.caseNumber}".` 
                }, { status: 409 });
            }
        }

        if (unit) {
            const [updated] = await db.update(inventoryUnits)
                .set({
                    rfidTag: cleanRfid,
                    updatedAt: new Date(),
                })
                .where(eq(inventoryUnits.id, unit.id))
                .returning();

            return NextResponse.json({
                success: true,
                message: cleanRfid 
                    ? `Successfully paired RFID tag ${cleanRfid} with ${unit.assetTagCode} (${unit.product?.name || "Item"}).`
                    : `Unpaired RFID tag from ${unit.assetTagCode}.`,
                item: {
                    type: "unit",
                    id: updated.id,
                    identifier: updated.assetTagCode,
                    rfidTag: updated.rfidTag,
                    name: unit.product?.name || "Equipment Unit",
                }
            });
        } else if (flightCase) {
            const [updated] = await db.update(flightCases)
                .set({
                    rfidTag: cleanRfid,
                    updatedAt: new Date(),
                })
                .where(eq(flightCases.id, flightCase.id))
                .returning();

            return NextResponse.json({
                success: true,
                message: cleanRfid
                    ? `Successfully paired RFID tag ${cleanRfid} with flight case ${flightCase.caseNumber}.`
                    : `Unpaired RFID tag from flight case ${flightCase.caseNumber}.`,
                item: {
                    type: "flight_case",
                    id: updated.id,
                    identifier: updated.caseNumber,
                    rfidTag: updated.rfidTag,
                    name: updated.name,
                }
            });
        }
    } catch (error: any) {
        console.error("RFID Commissioning Error:", error);
        return NextResponse.json({ error: error.message || "Failed to pair RFID tag" }, { status: 500 });
    }
}

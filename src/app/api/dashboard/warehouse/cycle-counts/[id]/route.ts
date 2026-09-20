import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryCycleCounts, cycleCountItems, inventoryUnits, warehouseBins } from "@/lib/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { v4 as uuid } from "uuid";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;

        const count = await db.query.inventoryCycleCounts.findFirst({
            where: eq(inventoryCycleCounts.id, id),
            with: {
                warehouse: true,
                zone: true,
                countedBy: { columns: { id: true, name: true, email: true } },
                items: {
                    with: {
                        inventoryUnit: {
                            with: { product: true }
                        },
                        expectedBin: true,
                        scannedBin: true,
                    }
                }
            }
        });

        if (!count) return NextResponse.json({ error: "Cycle count not found" }, { status: 404 });
        return NextResponse.json({ count });
    } catch (e: any) {
        console.error("GET /api/dashboard/warehouse/cycle-counts/[id] error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST: Scan asset tag or RFID burst into cycle count
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const body = await req.json();
        const { assetTagCode, tags, scannedBinCode } = body;

        const count = await db.query.inventoryCycleCounts.findFirst({
            where: eq(inventoryCycleCounts.id, id),
            with: { items: true }
        });

        if (!count) return NextResponse.json({ error: "Cycle count not found" }, { status: 404 });

        // Resolve target scanned bin if provided
        let scannedBin = null;
        if (scannedBinCode) {
            scannedBin = await db.query.warehouseBins.findFirst({
                where: eq(warehouseBins.binCode, scannedBinCode.trim().toUpperCase())
            });
        }

        // Handle Batch RFID Wand Sweep
        if (Array.isArray(tags) && tags.length > 0) {
            const cleanTags = Array.from(new Set(tags.map((t: string) => t.trim().toUpperCase()).filter(Boolean)));
            if (cleanTags.length === 0) {
                return NextResponse.json({ error: "No valid tags provided in batch." }, { status: 400 });
            }

            // Dual EPC & Barcode query
            const matchedUnits = await db.query.inventoryUnits.findMany({
                where: or(
                    inArray(inventoryUnits.assetTagCode, cleanTags),
                    inArray(inventoryUnits.rfidTag, cleanTags)
                ),
                with: { bin: true, product: true }
            });

            const processedUnits: any[] = [];
            for (const unit of matchedUnits) {
                const existingItem = count.items.find(i => i.inventoryUnitId === unit.id);
                let discrepancyType = "none";
                if (scannedBin && unit.binId && scannedBin.id !== unit.binId) {
                    discrepancyType = "wrong_bin";
                }

                if (existingItem) {
                    await db.update(cycleCountItems)
                        .set({
                            scannedBinId: scannedBin?.id || unit.binId || null,
                            scannedStatus: unit.availabilityStatus,
                            discrepancyType,
                            isResolved: discrepancyType === "none",
                        })
                        .where(eq(cycleCountItems.id, existingItem.id));
                } else {
                    await db.insert(cycleCountItems).values({
                        id: uuid(),
                        cycleCountId: id,
                        inventoryUnitId: unit.id,
                        productId: unit.productId,
                        expectedBinId: unit.binId || null,
                        scannedBinId: scannedBin?.id || null,
                        expectedStatus: unit.availabilityStatus,
                        scannedStatus: unit.availabilityStatus,
                        discrepancyType: "wrong_location",
                        isResolved: false,
                        resolutionNotes: "Item detected via RFID sweep but was not assigned to this zone.",
                    });
                }
                processedUnits.push({
                    id: unit.id,
                    assetTagCode: unit.assetTagCode,
                    rfidTag: unit.rfidTag,
                    productName: unit.product?.name,
                    discrepancyType,
                });
            }

            // Update count aggregate statistics
            const allItems = await db.query.cycleCountItems.findMany({ where: eq(cycleCountItems.cycleCountId, id) });
            const scanned = allItems.filter(i => i.discrepancyType !== "missing");
            const discrepancies = allItems.filter(i => i.discrepancyType !== "none");

            await db.update(inventoryCycleCounts)
                .set({
                    totalScannedUnits: scanned.length,
                    discrepancyCount: discrepancies.length,
                    updatedAt: new Date(),
                })
                .where(eq(inventoryCycleCounts.id, id));

            return NextResponse.json({
                success: true,
                sweepMode: "rfid_burst",
                totalSubmitted: cleanTags.length,
                matchedCount: matchedUnits.length,
                discrepanciesFound: discrepancies.length,
                units: processedUnits,
            });
        }

        // Single Tag Scan (supports Barcode OR 24-char RFID EPC)
        if (!assetTagCode) {
            return NextResponse.json({ error: "assetTagCode or tags array is required." }, { status: 400 });
        }

        const cleanCode = assetTagCode.trim().toUpperCase();
        const unit = await db.query.inventoryUnits.findFirst({
            where: or(
                eq(inventoryUnits.assetTagCode, cleanCode),
                eq(inventoryUnits.rfidTag, cleanCode)
            ),
            with: { bin: true, product: true }
        });

        if (!unit) {
            return NextResponse.json({ error: `Unit with tag/EPC "${assetTagCode}" not found in database.` }, { status: 404 });
        }

        // Check if item was expected
        const existingItem = count.items.find(i => i.inventoryUnitId === unit.id);

        let discrepancyType = "none";
        if (scannedBin && unit.binId && scannedBin.id !== unit.binId) {
            discrepancyType = "wrong_bin";
        }

        if (existingItem) {
            await db.update(cycleCountItems)
                .set({
                    scannedBinId: scannedBin?.id || unit.binId || null,
                    scannedStatus: unit.availabilityStatus,
                    discrepancyType,
                    isResolved: discrepancyType === "none",
                })
                .where(eq(cycleCountItems.id, existingItem.id));
        } else {
            await db.insert(cycleCountItems).values({
                id: uuid(),
                cycleCountId: id,
                inventoryUnitId: unit.id,
                productId: unit.productId,
                expectedBinId: unit.binId || null,
                scannedBinId: scannedBin?.id || null,
                expectedStatus: unit.availabilityStatus,
                scannedStatus: unit.availabilityStatus,
                discrepancyType: "wrong_location",
                isResolved: false,
                resolutionNotes: "Item found in count but was not in expected zone inventory.",
            });
        }

        // Update count totals
        const allItems = await db.query.cycleCountItems.findMany({ where: eq(cycleCountItems.cycleCountId, id) });
        const scanned = allItems.filter(i => i.discrepancyType !== "missing");
        const discrepancies = allItems.filter(i => i.discrepancyType !== "none");

        await db.update(inventoryCycleCounts)
            .set({
                totalScannedUnits: scanned.length,
                discrepancyCount: discrepancies.length,
                updatedAt: new Date(),
            })
            .where(eq(inventoryCycleCounts.id, id));

        return NextResponse.json({
            success: true,
            unit: {
                id: unit.id,
                assetTagCode: unit.assetTagCode,
                rfidTag: unit.rfidTag,
                productName: unit.product?.name,
                conditionStatus: unit.conditionStatus,
            },
            discrepancyType,
        });
    } catch (e: any) {
        console.error("POST /api/dashboard/warehouse/cycle-counts/[id] scan error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// PATCH: Reconcile / Complete count
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const isAuthorized = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.WAREHOUSE_MANAGER].includes(user.role as any);
        if (!isAuthorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const { id } = await params;
        const body = await req.json();
        const { status, notes, applyReconciliation } = body;

        const updateData: any = { updatedAt: new Date() };
        if (notes) updateData.notes = notes;
        if (status) {
            updateData.status = status;
            if (status === "completed") updateData.completedAt = new Date();
            if (status === "reconciled") updateData.reconciledAt = new Date();
        }

        // If applyReconciliation: automatically relocate items found in wrong bins to their scanned bins
        if (applyReconciliation) {
            const countItems = await db.query.cycleCountItems.findMany({
                where: and(
                    eq(cycleCountItems.cycleCountId, id),
                    eq(cycleCountItems.discrepancyType, "wrong_bin")
                )
            });

            for (const item of countItems) {
                if (item.inventoryUnitId && item.scannedBinId) {
                    await db.update(inventoryUnits)
                        .set({ binId: item.scannedBinId, updatedAt: new Date() })
                        .where(eq(inventoryUnits.id, item.inventoryUnitId));

                    await db.update(cycleCountItems)
                        .set({ isResolved: true, resolutionNotes: "Auto-reconciled to scanned bin." })
                        .where(eq(cycleCountItems.id, item.id));
                }
            }
        }

        const updated = await db.update(inventoryCycleCounts)
            .set(updateData)
            .where(eq(inventoryCycleCounts.id, id))
            .returning();

        return NextResponse.json({ count: updated[0] });
    } catch (e: any) {
        console.error("PATCH /api/dashboard/warehouse/cycle-counts/[id] error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

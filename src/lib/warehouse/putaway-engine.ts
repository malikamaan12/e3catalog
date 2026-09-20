import { db } from "@/lib/db";
import { inventoryUnits, warehouseBins, warehouseZones } from "@/lib/db/schema";
import { eq, or, sql } from "drizzle-orm";

export interface PutawayRecommendation {
    unit: {
        id: string;
        assetTagCode: string;
        productName: string;
        categoryName?: string;
        conditionStatus: string;
        currentLocation: string | null;
    };
    recommendedBin: {
        id: string;
        binCode: string;
        zoneName: string;
        zoneType: string;
        aisle: string | null;
        rack: string | null;
        shelf: string | null;
        bin: string | null;
        currentCount: number;
        maxCapacity: number;
        reason: string;
    } | null;
    alternativeBins: Array<{
        id: string;
        binCode: string;
        zoneName: string;
        currentCount: number;
        maxCapacity: number;
    }>;
}

/**
 * Calculates the optimal storage bin for returned, newly inspected, or commissioned gear.
 */
export async function recommendPutawayBin(unitIdentifier: string): Promise<PutawayRecommendation> {
    const cleanId = unitIdentifier.trim().toUpperCase();

    // 1. Locate unit
    const unit = await db.query.inventoryUnits.findFirst({
        where: or(
            eq(inventoryUnits.assetTagCode, cleanId),
            eq(inventoryUnits.id, unitIdentifier),
            eq(inventoryUnits.rfidTag, cleanId),
            eq(inventoryUnits.serialNumber, cleanId)
        ),
        with: {
            product: {
                with: { category: true }
            }
        }
    });

    if (!unit) {
        throw new Error(`Inventory unit "${unitIdentifier}" not found.`);
    }

    const prodName = unit.product?.name || "Equipment";
    const catName = unit.product?.category?.name || "";
    const isDamaged = ["needs_service", "damaged", "maintenance_required", "poor"].includes(unit.conditionStatus);

    // 2. Fetch all active bins with their current unit counts
    const binsWithCount = await db
        .select({
            id: warehouseBins.id,
            binCode: warehouseBins.binCode,
            aisle: warehouseBins.aisle,
            rack: warehouseBins.rack,
            shelf: warehouseBins.shelf,
            bin: warehouseBins.bin,
            maxCapacity: warehouseBins.maxCapacity,
            zoneId: warehouseBins.zoneId,
            zoneName: warehouseZones.name,
            zoneType: warehouseZones.zoneType,
            currentCount: sql<number>`count(${inventoryUnits.id})::int`,
        })
        .from(warehouseBins)
        .innerJoin(warehouseZones, eq(warehouseBins.zoneId, warehouseZones.id))
        .leftJoin(inventoryUnits, eq(inventoryUnits.shelfLocation, warehouseBins.binCode))
        .where(eq(warehouseBins.isActive, true))
        .groupBy(
            warehouseBins.id,
            warehouseBins.binCode,
            warehouseBins.aisle,
            warehouseBins.rack,
            warehouseBins.shelf,
            warehouseBins.bin,
            warehouseBins.maxCapacity,
            warehouseBins.zoneId,
            warehouseZones.name,
            warehouseZones.zoneType
        );

    // 3. Selection rules
    let bestBin: any = null;
    let reason = "";

    // Rule A: Damaged equipment -> Quarantine / Repair Zone
    if (isDamaged) {
        bestBin = binsWithCount.find(b => b.zoneType === "quarantine" && b.currentCount < (b.maxCapacity || 50));
        reason = "Asset requires technical inspection/service - routed to Quarantine Zone.";
    }

    // Rule B: Previous Home Bin (if valid and has room)
    if (!bestBin && unit.shelfLocation) {
        const homeBin = binsWithCount.find(b => b.binCode === unit.shelfLocation && b.currentCount < (b.maxCapacity || 50));
        if (homeBin) {
            bestBin = homeBin;
            reason = "Returning to designated home shelf location.";
        }
    }

    // Rule C: Category Affinity Matching
    if (!bestBin) {
        const lowerCat = `${catName} ${prodName}`.toLowerCase();
        let targetZoneKeyword = "storage";

        if (lowerCat.includes("audio") || lowerCat.includes("speaker") || lowerCat.includes("mic")) {
            targetZoneKeyword = "audio";
        } else if (lowerCat.includes("light") || lowerCat.includes("beam") || lowerCat.includes("led") || lowerCat.includes("spot")) {
            targetZoneKeyword = "light";
        } else if (lowerCat.includes("truss") || lowerCat.includes("rigging") || lowerCat.includes("motor")) {
            targetZoneKeyword = "truss";
        } else if (lowerCat.includes("video") || lowerCat.includes("screen") || lowerCat.includes("display")) {
            targetZoneKeyword = "video";
        }

        bestBin = binsWithCount.find(b => 
            b.zoneName.toLowerCase().includes(targetZoneKeyword) && 
            b.currentCount < (b.maxCapacity || 50)
        );

        if (bestBin) {
            reason = `Category affinity match: placed in ${bestBin.zoneName}.`;
        }
    }

    // Rule D: Fallback to any storage bin with available capacity
    if (!bestBin) {
        bestBin = binsWithCount.find(b => b.zoneType === "storage" && b.currentCount < (b.maxCapacity || 50)) || binsWithCount[0];
        reason = bestBin ? "Optimal capacity match in general storage." : "Default warehouse intake staging.";
    }

    const alternatives = binsWithCount
        .filter(b => bestBin && b.id !== bestBin.id && b.currentCount < (b.maxCapacity || 50))
        .slice(0, 5)
        .map(b => ({
            id: b.id,
            binCode: b.binCode,
            zoneName: b.zoneName,
            currentCount: b.currentCount,
            maxCapacity: b.maxCapacity || 50,
        }));

    return {
        unit: {
            id: unit.id,
            assetTagCode: unit.assetTagCode,
            productName: prodName,
            categoryName: catName,
            conditionStatus: unit.conditionStatus,
            currentLocation: unit.shelfLocation,
        },
        recommendedBin: bestBin ? {
            id: bestBin.id,
            binCode: bestBin.binCode,
            zoneName: bestBin.zoneName,
            zoneType: bestBin.zoneType,
            aisle: bestBin.aisle,
            rack: bestBin.rack,
            shelf: bestBin.shelf,
            bin: bestBin.bin,
            currentCount: bestBin.currentCount,
            maxCapacity: bestBin.maxCapacity || 50,
            reason,
        } : null,
        alternativeBins: alternatives,
    };
}

/**
 * Confirms physical putaway of an equipment unit into a designated warehouse bin.
 */
export async function confirmPutaway(
    unitIdentifier: string,
    targetBinCode: string
): Promise<{ success: boolean; message: string; unit: any }> {
    const cleanUnitId = unitIdentifier.trim().toUpperCase();
    const cleanBin = targetBinCode.trim().toUpperCase();

    // 1. Locate unit
    const unit = await db.query.inventoryUnits.findFirst({
        where: or(
            eq(inventoryUnits.assetTagCode, cleanUnitId),
            eq(inventoryUnits.id, unitIdentifier),
            eq(inventoryUnits.rfidTag, cleanUnitId)
        ),
        with: { product: true }
    });

    if (!unit) {
        return { success: false, message: `Unit "${unitIdentifier}" not found.`, unit: null };
    }

    // 2. Validate bin exists
    const bin = await db.query.warehouseBins.findFirst({
        where: eq(warehouseBins.binCode, cleanBin),
        with: { zone: true }
    });

    const isDirectBin = !!bin;
    const finalLocation = isDirectBin ? bin.binCode : cleanBin;

    // 3. Atomically update unit shelf location
    const [updated] = await db.update(inventoryUnits)
        .set({
            shelfLocation: finalLocation,
            availabilityStatus: "in_warehouse",
            updatedAt: new Date(),
        })
        .where(eq(inventoryUnits.id, unit.id))
        .returning();

    return {
        success: true,
        message: `Successfully put away ${unit.assetTagCode} (${unit.product?.name || "Equipment"}) in ${finalLocation}${bin ? ` (${bin.zone?.name || "Zone"})` : ""}.`,
        unit: {
            id: updated.id,
            assetTagCode: updated.assetTagCode,
            shelfLocation: updated.shelfLocation,
            status: updated.availabilityStatus,
        }
    };
}

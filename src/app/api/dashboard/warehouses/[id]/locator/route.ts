import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendorWarehouses, inventoryUnits, products, warehouseZones, warehouseBins } from "@/lib/db/schema";
import { eq, or, ilike, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

function parseTierLevel(shelfLocation?: string | null): number {
    if (!shelfLocation) return 1;
    // Matches -T1, -T02, Tier 3, Shelf 2, Level 4
    const match = shelfLocation.match(/(?:-T|Tier\s*|Shelf\s*|Level\s*)(\d+)/i);
    if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num >= 1 && num <= 10) return num;
    }
    return 1;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id: warehouseId } = await params;
        const url = new URL(req.url);
        const query = (url.searchParams.get("q") || "").trim();

        if (!query) {
            return NextResponse.json({ error: "Search query 'q' parameter is required." }, { status: 400 });
        }

        const warehouse = await db.query.vendorWarehouses.findFirst({
            where: eq(vendorWarehouses.id, warehouseId),
        });

        if (!warehouse) {
            return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
        }

        const layout = warehouse.layoutConfig;
        const elements = layout?.elements || [];
        const lowerQ = query.toLowerCase();

        // 1. Search inventory units with case-insensitive ilike
        const units = await db
            .select({
                id: inventoryUnits.id,
                assetTagCode: inventoryUnits.assetTagCode,
                rfidTag: inventoryUnits.rfidTag,
                serialNumber: inventoryUnits.serialNumber,
                shelfLocation: inventoryUnits.shelfLocation,
                conditionStatus: inventoryUnits.conditionStatus,
                availabilityStatus: inventoryUnits.availabilityStatus,
                healthScore: inventoryUnits.healthScore,
                zoneId: inventoryUnits.zoneId,
                binId: inventoryUnits.binId,
                productName: products.name,
                categoryId: products.categoryId,
                productImage: products.thumbnailUrl,
            })
            .from(inventoryUnits)
            .leftJoin(products, eq(inventoryUnits.productId, products.id))
            .where(
                and(
                    eq(inventoryUnits.warehouseId, warehouseId),
                    or(
                        ilike(inventoryUnits.assetTagCode, `%${query}%`),
                        ilike(inventoryUnits.serialNumber, `%${query}%`),
                        ilike(inventoryUnits.rfidTag, `%${query}%`),
                        ilike(inventoryUnits.shelfLocation, `%${query}%`),
                        ilike(products.name, `%${query}%`)
                    )
                )
            )
            .limit(15);

        // 2. Search warehouse physical layout elements (racks, staging pads, loading bays, qc lab)
        const matchedElements = elements
            .filter((el) => {
                const label = (el.label || "").toLowerCase();
                const rackCode = (el.rackCode || "").toLowerCase();
                const aisle = (el.aisle || "").toLowerCase();
                const zoneCode = (el.zoneCode || "").toLowerCase();
                return (
                    label.includes(lowerQ) ||
                    rackCode.includes(lowerQ) ||
                    aisle.includes(lowerQ) ||
                    zoneCode.includes(lowerQ)
                );
            })
            .slice(0, 6)
            .map((el) => {
                const isRack = el.type === "rack";
                return {
                    id: el.id,
                    isSpatialElement: true,
                    type: el.type,
                    label: el.label || el.rackCode || "Storage Unit",
                    assetTagCode: el.rackCode || el.label || "LOCATION",
                    productName: `${isRack ? "Rack Storage" : el.type === "dock_door" ? "Loading Bay" : "Warehouse Zone"}: ${el.label || el.rackCode}`,
                    conditionStatus: el.status === "dead_spot" ? "COLD SPOT" : "ACTIVE",
                    rackCode: el.rackCode || el.label,
                    zoneCode: el.zoneCode,
                    aisle: el.aisle,
                    levels: el.levels || 4,
                    spatialLocation: {
                        rackId: el.id,
                        rackCode: el.rackCode || el.label,
                        x: el.x,
                        y: el.y,
                        width: el.width,
                        height: el.height,
                        aisle: el.aisle,
                        zoneCode: el.zoneCode,
                        level: 1,
                    },
                    breadcrumbs: [
                        warehouse.name,
                        el.zoneCode || "Zone",
                        el.aisle,
                        el.rackCode || el.label,
                    ].filter(Boolean) as string[],
                    walkingDirections: `Navigate via Main Forklift Highway > Access ${el.aisle ? `${el.aisle} > ` : ""}${el.rackCode || el.label}`,
                };
            });

        // 3. Match each unit to its physical spatial element in the floor plan
        const enrichedUnits = units.map((u) => {
            let matchedRack = elements.find((el) => {
                if (el.type !== "rack") return false;
                if (el.rackCode && u.shelfLocation && u.shelfLocation.toUpperCase().includes(el.rackCode.toUpperCase())) return true;
                if (el.label && u.shelfLocation && u.shelfLocation.toUpperCase().includes(el.label.toUpperCase())) return true;
                return false;
            });

            // Match by zone if not directly matched by rackCode
            if (!matchedRack && u.zoneId) {
                const zoneRacks = elements.filter((el) => el.type === "rack" && el.zoneId === u.zoneId);
                if (zoneRacks.length > 0) {
                    matchedRack = zoneRacks[0];
                }
            }

            // Fallback to first rack if none matched
            if (!matchedRack) {
                matchedRack = elements.find((el) => el.type === "rack");
            }

            const level = parseTierLevel(u.shelfLocation);

            const breadcrumbs = [
                warehouse.name,
                matchedRack?.zoneCode || "Zone",
                matchedRack?.aisle || "Aisle",
                matchedRack?.rackCode || matchedRack?.label || "Rack",
                `Tier ${level}`,
                u.shelfLocation || "Slot",
            ].filter(Boolean) as string[];

            return {
                ...u,
                isSpatialElement: false,
                spatialLocation: matchedRack
                    ? {
                          rackId: matchedRack.id,
                          rackCode: matchedRack.rackCode || matchedRack.label,
                          x: matchedRack.x,
                          y: matchedRack.y,
                          width: matchedRack.width,
                          height: matchedRack.height,
                          aisle: matchedRack.aisle,
                          zoneCode: matchedRack.zoneCode,
                          level,
                      }
                    : null,
                breadcrumbs,
                walkingDirections: `Enter from Dock Bay 02 > Follow Main Forklift Highway > Turn into ${matchedRack?.aisle || "Aisle A"} > Access Rack ${matchedRack?.rackCode || "AUD-01"} at Tier ${level}`,
            };
        });

        // Combine: direct spatial elements first, then item units
        const allMatches = [...matchedElements, ...enrichedUnits];

        return NextResponse.json({
            found: allMatches.length > 0,
            totalMatches: allMatches.length,
            bestMatch: allMatches[0] || null,
            matches: allMatches,
            spatialElements: matchedElements,
            units: enrichedUnits,
        });
    } catch (e: any) {
        console.error("GET /api/dashboard/warehouses/[id]/locator error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

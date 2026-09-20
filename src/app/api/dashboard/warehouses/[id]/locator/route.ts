import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendorWarehouses, inventoryUnits, products, warehouseZones, warehouseBins } from "@/lib/db/schema";
import { eq, or, like, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
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

        // Search inventory units
        const cleanQ = query.toUpperCase();
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
                        like(inventoryUnits.assetTagCode, `%${cleanQ}%`),
                        like(inventoryUnits.serialNumber, `%${query}%`),
                        like(inventoryUnits.rfidTag, `%${cleanQ}%`),
                        like(products.name, `%${query}%`)
                    )
                )
            )
            .limit(10);

        if (units.length === 0) {
            return NextResponse.json({ found: false, matches: [] });
        }

        const layout = warehouse.layoutConfig;
        const elements = layout?.elements || [];

        // Match each unit to its physical spatial element in the floor plan
        const enrichedMatches = units.map((u) => {
            let matchedRack = elements.find((el) => {
                if (el.type !== "rack") return false;
                if (el.rackCode && u.shelfLocation && u.shelfLocation.toUpperCase().includes(el.rackCode.toUpperCase())) return true;
                if (el.zoneId && u.zoneId === el.zoneId) return true;
                return false;
            });

            // Default fallback if not directly mapped
            if (!matchedRack) {
                matchedRack = elements.find((el) => el.type === "rack");
            }

            const level = u.shelfLocation && u.shelfLocation.includes("Shelf 2") ? 2 : 1;

            const breadcrumbs = [
                warehouse.name,
                matchedRack?.zoneCode || "Zone",
                matchedRack?.aisle || "Aisle A",
                matchedRack?.rackCode || matchedRack?.label || "Rack 01",
                `Tier ${level}`,
                u.shelfLocation || "Bin Slot",
            ];

            return {
                ...u,
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

        return NextResponse.json({
            found: true,
            totalMatches: enrichedMatches.length,
            bestMatch: enrichedMatches[0],
            matches: enrichedMatches,
        });
    } catch (e: any) {
        console.error("GET /api/dashboard/warehouses/[id]/locator error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

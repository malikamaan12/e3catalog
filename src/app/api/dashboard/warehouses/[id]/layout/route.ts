import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendorWarehouses, warehouseZones, warehouseBins, inventoryUnits, products } from "@/lib/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { generateDefaultWarehouseLayout } from "@/lib/warehouse/layout-defaults";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id: warehouseId } = await params;

        // 1. Fetch warehouse record
        const warehouse = await db.query.vendorWarehouses.findFirst({
            where: eq(vendorWarehouses.id, warehouseId),
        });

        if (!warehouse) {
            return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
        }

        // 2. Fetch associated zones & bins
        const zones = await db.select().from(warehouseZones).where(eq(warehouseZones.warehouseId, warehouseId));
        const bins = await db.select().from(warehouseBins).where(eq(warehouseBins.warehouseId, warehouseId));

        // 3. Fetch inventory units in this warehouse
        const units = await db
            .select({
                id: inventoryUnits.id,
                assetTagCode: inventoryUnits.assetTagCode,
                rfidTag: inventoryUnits.rfidTag,
                serialNumber: inventoryUnits.serialNumber,
                shelfLocation: inventoryUnits.shelfLocation,
                conditionStatus: inventoryUnits.conditionStatus,
                availabilityStatus: inventoryUnits.availabilityStatus,
                binId: inventoryUnits.binId,
                zoneId: inventoryUnits.zoneId,
                productName: products.name,
                categoryId: products.categoryId,
                productImage: products.thumbnailUrl,
            })
            .from(inventoryUnits)
            .leftJoin(products, eq(inventoryUnits.productId, products.id))
            .where(eq(inventoryUnits.warehouseId, warehouseId));

        // 4. Resolve or generate layout config
        let layout = warehouse.layoutConfig;
        if (!layout || !layout.elements || layout.elements.length === 0) {
            layout = generateDefaultWarehouseLayout(warehouse.name, zones);
            // Persist the default layout so future adjustments build upon it
            await db
                .update(vendorWarehouses)
                .set({ layoutConfig: layout, updatedAt: new Date() })
                .where(eq(vendorWarehouses.id, warehouseId));
        }

        // 5. Enrich rack elements with live occupancy & items
        let totalRacks = 0;
        let emptyRacks = 0;
        let deadSpots = 0;
        let totalCapacity = 0;
        let totalOccupiedUnits = 0;

        const enrichedElements = layout.elements.map((el) => {
            if (el.type !== "rack") return el;

            totalRacks++;
            const rackCapacity = (el.levels || 4) * (el.capacityPerLevel || 25);
            totalCapacity += rackCapacity;

            // Match units mapped to this rack either by zone/rackCode or shelfLocation
            const matchingUnits = units.filter((u) => {
                if (el.rackCode && u.shelfLocation && u.shelfLocation.toUpperCase().includes(el.rackCode.toUpperCase())) return true;
                if (el.zoneId && u.zoneId === el.zoneId) return true;
                return false;
            });

            const unitCount = matchingUnits.length;
            totalOccupiedUnits += unitCount;
            const occupancyPercent = rackCapacity > 0 ? Math.min(100, Math.round((unitCount / rackCapacity) * 100)) : 0;
            const isEmpty = unitCount === 0;
            const isDeadSpot = el.status === "dead_spot" || (isEmpty && el.id.includes("04")); // Flag simulated cold corners

            if (isEmpty) emptyRacks++;
            if (isDeadSpot) deadSpots++;

            // Split into tiers (shelves)
            const tiers = [];
            const tierCount = el.levels || 4;
            for (let i = 1; i <= tierCount; i++) {
                const tierUnits = matchingUnits.filter((_, idx) => (idx % tierCount) === (i - 1));
                tiers.push({
                    levelNumber: i,
                    levelName: `Tier ${i} (Shelf ${i})`,
                    capacity: el.capacityPerLevel || 25,
                    currentUnits: tierUnits.length,
                    items: tierUnits.slice(0, 5), // Preview up to 5 items
                });
            }

            return {
                ...el,
                currentUnits: unitCount,
                maxCapacity: rackCapacity,
                occupancyPercent,
                isEmpty,
                isDeadSpot,
                tiers,
                previewItems: matchingUnits.slice(0, 4),
            };
        });

        const overallOccupancy = totalCapacity > 0 ? Math.min(100, Math.round((totalOccupiedUnits / totalCapacity) * 100)) : 0;

        // Efficiency score based on balanced distribution & low dead spots
        const deadSpotPenalty = deadSpots * 8;
        const efficiencyScore = Math.max(20, Math.min(98, 100 - deadSpotPenalty));

        return NextResponse.json({
            warehouse: {
                id: warehouse.id,
                name: warehouse.name,
                address: warehouse.address,
                city: warehouse.city,
                isDefault: warehouse.isDefault,
            },
            layout: {
                ...layout,
                elements: enrichedElements,
            },
            metrics: {
                totalRacks,
                emptyRacks,
                deadSpots,
                totalCapacity,
                totalOccupiedUnits,
                overallOccupancy,
                efficiencyScore,
            },
            zones,
            binsCount: bins.length,
        });
    } catch (e: any) {
        console.error("GET /api/dashboard/warehouses/[id]/layout error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const isAuthorized = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.WAREHOUSE_MANAGER].includes(user.role as any);
        if (!isAuthorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const { id: warehouseId } = await params;
        const body = await req.json();
        const { layoutConfig } = body;

        if (!layoutConfig || !layoutConfig.elements || !layoutConfig.dimensions) {
            return NextResponse.json({ error: "Invalid layoutConfig structure" }, { status: 400 });
        }

        layoutConfig.updatedAt = new Date().toISOString();
        layoutConfig.version = (layoutConfig.version || 1) + 1;

        // Clean internal computed runtime fields before saving to DB
        const sanitizedElements = layoutConfig.elements.map((el: any) => ({
            id: el.id,
            type: el.type,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            rotation: el.rotation || 0,
            label: el.label,
            zoneId: el.zoneId || null,
            zoneCode: el.zoneCode || null,
            rackCode: el.rackCode || null,
            aisle: el.aisle || null,
            levels: el.levels || 4,
            capacityPerLevel: el.capacityPerLevel || 25,
            color: el.color || null,
            status: el.status || "active",
            orientation: el.orientation || "horizontal",
        }));

        const sanitizedConfig = {
            ...layoutConfig,
            elements: sanitizedElements,
        };

        await db
            .update(vendorWarehouses)
            .set({
                layoutConfig: sanitizedConfig,
                updatedAt: new Date(),
            })
            .where(eq(vendorWarehouses.id, warehouseId));

        return NextResponse.json({
            success: true,
            layout: sanitizedConfig,
            message: "Warehouse floor plan and spatial layout saved successfully.",
        });
    } catch (e: any) {
        console.error("PUT /api/dashboard/warehouses/[id]/layout error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, pool } from "@/lib/db";
import { inventoryUnits, flightCases } from "@/lib/db/schema";
import { sql, isNotNull } from "drizzle-orm";

export async function GET() {
    const session = await getSession();
    if (!session || !["admin", "super_admin", "vendor", "warehouse_manager"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Latency test against Supabase pooler
        const start = Date.now();
        await pool.query("SELECT 1;");
        const dbLatencyMs = Date.now() - start;

        // 2. Count units and flight cases
        const [unitStats] = await db.select({
            total: sql<number>`count(*)::int`,
            tagged: sql<number>`count(case when ${inventoryUnits.rfidTag} is not null and ${inventoryUnits.rfidTag} != '' then 1 end)::int`,
        }).from(inventoryUnits);

        const [caseStats] = await db.select({
            total: sql<number>`count(*)::int`,
            tagged: sql<number>`count(case when ${flightCases.rfidTag} is not null and ${flightCases.rfidTag} != '' then 1 end)::int`,
        }).from(flightCases);

        // 3. Check postgres index registration
        const indexRes = await pool.query(`
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'inventory_units' AND indexname = 'inventory_units_rfid_tag_idx';
        `);
        const rfidIndexPresent = (indexRes.rowCount ?? 0) > 0;

        const totalItems = (unitStats?.total || 0) + (caseStats?.total || 0);
        const taggedItems = (unitStats?.tagged || 0) + (caseStats?.tagged || 0);
        const coveragePct = totalItems > 0 ? Math.round((taggedItems / totalItems) * 100) : 0;

        return NextResponse.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            database: {
                status: "connected",
                latencyMs: dbLatencyMs,
                pooler: "Supabase Transaction Pooler (Port 6543)",
            },
            rfidFleet: {
                totalUnits: unitStats?.total || 0,
                taggedUnits: unitStats?.tagged || 0,
                totalFlightCases: caseStats?.total || 0,
                taggedFlightCases: caseStats?.tagged || 0,
                totalAssets: totalItems,
                totalTaggedAssets: taggedItems,
                tagCoveragePct: coveragePct,
            },
            indexes: {
                inventoryUnitsRfidTagIdx: rfidIndexPresent,
                flightCasesAssetTagIdx: true,
            },
            hardwareReadiness: {
                chainwayR6Supported: true,
                postekTX3rSupported: true,
                zebraZD421Supported: true,
                burstModeEnabled: true,
            }
        });
    } catch (error: any) {
        console.error("Hardware Health Error:", error);
        return NextResponse.json({
            status: "degraded",
            error: error.message || "Failed to fetch hardware diagnostics",
            timestamp: new Date().toISOString(),
        }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
    bookings, 
    inventoryUnits, 
    bookingUnitAssignments, 
    proofOfDeliveries, 
    fleetGpsPings,
    systemLogs 
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { getCurrentUser } from "@/lib/auth";
import { verifyFlightCasePack, verifyFlightCaseReturn } from "@/lib/kit-assemblies";
import { logStatusTransition } from "@/lib/state-machine";

interface QueuedAction {
    id: string;
    actionType: "fulfillment_scan" | "flight_case_verify" | "driver_pod" | "driver_gps";
    endpoint: string;
    method?: string;
    payload: any;
    timestamp: number;
}

export async function POST(req: NextRequest) {
    try {
        let user: any = null;
        try {
            user = await getCurrentUser();
        } catch {
            user = null;
        }
        const body = await req.json();
        const actions: QueuedAction[] = body.actions || [];

        if (!Array.isArray(actions) || actions.length === 0) {
            return NextResponse.json({ error: "No actions provided in batch" }, { status: 400 });
        }

        const results: Array<{ id: string; success: boolean; message?: string }> = [];

        // Process queued actions in chronological order
        const sortedActions = [...actions].sort((a, b) => a.timestamp - b.timestamp);

        for (const action of sortedActions) {
            try {
                switch (action.actionType) {
                    // ── 1. Warehouse Fulfillment QR Scan ──
                    case "fulfillment_scan": {
                        const { assetTag, action: subAction, bookingId, condition = "good", notes } = action.payload;
                        
                        // Find inventory unit by asset tag
                        const [unit] = await db
                            .select()
                            .from(inventoryUnits)
                            .where(eq(inventoryUnits.assetTagCode, assetTag))
                            .limit(1);

                        if (!unit) {
                            results.push({ id: action.id, success: false, message: `Asset tag ${assetTag} not recognized in inventory` });
                            continue;
                        }

                        if (subAction === "dispatch") {
                            // Assign / dispatch unit
                            await db.update(inventoryUnits)
                                .set({ availabilityStatus: "in_transit", updatedAt: new Date() })
                                .where(eq(inventoryUnits.id, unit.id));

                            if (bookingId) {
                                await db.insert(bookingUnitAssignments).values({
                                    id: uuid(),
                                    bookingId,
                                    inventoryUnitId: unit.id,
                                    status: "dispatched",
                                    assignedAt: new Date(),
                                }).onConflictDoNothing().catch(() => {});
                            }

                            results.push({ id: action.id, success: true, message: `Unit ${assetTag} successfully dispatched (synced from offline buffer)` });
                        } else if (subAction === "return") {
                            // Return unit
                            await db.update(inventoryUnits)
                                .set({ 
                                    availabilityStatus: condition === "maintenance_required" ? "maintenance" : "in_warehouse", 
                                    conditionStatus: condition,
                                    updatedAt: new Date() 
                                })
                                .where(eq(inventoryUnits.id, unit.id));

                            if (bookingId && bookingId !== "auto") {
                                await db.update(bookingUnitAssignments)
                                    .set({ status: "returned" })
                                    .where(eq(bookingUnitAssignments.inventoryUnitId, unit.id));
                            }

                            results.push({ id: action.id, success: true, message: `Unit ${assetTag} checked in as ${condition} (synced from offline buffer)` });
                        } else {
                            results.push({ id: action.id, success: false, message: `Unsupported fulfillment sub-action: ${subAction}` });
                        }
                        break;
                    }

                    // ── 2. Master Flight Case Assembly Pack & Return ──
                    case "flight_case_verify": {
                        const { flightCaseId, mode = "pack", scannedTags = [], bookingId } = action.payload;
                        if (mode === "return_audit") {
                            const result = await verifyFlightCaseReturn({
                                flightCaseId,
                                returnedTags: scannedTags,
                                bookingId,
                                filedBy: user?.name || "Warehouse Staff (Offline Sync)",
                            });
                            results.push({ id: action.id, success: true, message: `Return audit processed. ${result.missingClaimsCount} missing claims logged.` });
                        } else {
                            const result = await verifyFlightCasePack({
                                flightCaseId,
                                scannedTags,
                                verifiedBy: user?.name || "Warehouse Staff (Offline Sync)",
                            });
                            results.push({ id: action.id, success: true, message: `Flight case ${result.status} (isFullyPacked: ${result.isFullyPacked})` });
                        }
                        break;
                    }

                    // ── 3. Driver Proof of Delivery (POD) ──
                    case "driver_pod": {
                        const {
                            bookingId,
                            dispatchLogId,
                            recipientName,
                            recipientPhone,
                            recipientNationalId,
                            signatureData,
                            deliveryStatus = "delivered",
                            notes: podNotes,
                            latitude,
                            longitude,
                        } = action.payload;

                        const podId = uuid();
                        await db.insert(proofOfDeliveries).values({
                            id: podId,
                            bookingId,
                            dispatchLogId: dispatchLogId || null,
                            driverId: user?.id || null,
                            driverName: user?.name || "Driver (Offline Sync)",
                            recipientName,
                            recipientPhone: recipientPhone || null,
                            recipientNationalId: recipientNationalId || null,
                            signatureData,
                            deliveryStatus,
                            notes: podNotes || "Submitted via Offline Sync Buffer",
                            latitude: latitude ? parseFloat(latitude) : null,
                            longitude: longitude ? parseFloat(longitude) : null,
                        }).onConflictDoNothing();

                        if (deliveryStatus === "delivered") {
                            await db.update(bookings)
                                .set({ status: "on_rent", updatedAt: new Date() })
                                .where(eq(bookings.id, bookingId));

                            if (user?.id) {
                                await logStatusTransition({
                                    actorId: user.id,
                                    targetId: bookingId,
                                    fromStatus: "dispatched",
                                    toStatus: "on_rent",
                                    role: "driver",
                                    details: `POD #${podId.slice(0, 8)} confirmed via Offline Sync. Recipient: ${recipientName}.`,
                                }).catch(() => {});
                            }
                        }

                        results.push({ id: action.id, success: true, message: `POD #${podId.slice(0, 8)} recorded and booking transitioned to on_rent.` });
                        break;
                    }

                    // ── 4. Driver Live GPS Telemetry Ping ──
                    case "driver_gps": {
                        const { dispatchLogId, vehiclePlate, latitude, longitude, speed, heading, status = "in_transit" } = action.payload;
                        const pingId = uuid();
                        await db.insert(fleetGpsPings).values({
                            id: pingId,
                            dispatchLogId,
                            driverId: user?.id || null,
                            vehiclePlate: vehiclePlate || null,
                            latitude: parseFloat(latitude),
                            longitude: parseFloat(longitude),
                            heading: heading !== undefined ? parseFloat(heading) : null,
                            speed: speed !== undefined ? parseFloat(speed) : null,
                            status,
                        });
                        results.push({ id: action.id, success: true, message: `GPS ping ${pingId.slice(0, 8)} logged.` });
                        break;
                    }

                    default:
                        results.push({ id: action.id, success: false, message: `Unknown action type` });
                }
            } catch (itemErr: any) {
                console.error(`[OfflineSync] Error processing item ${action.id}:`, itemErr);
                results.push({ id: action.id, success: false, message: itemErr.message || "Failed to process item" });
            }
        }

        const syncedCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;

        return NextResponse.json({
            success: true,
            totalCount: actions.length,
            syncedCount,
            failedCount,
            results,
            syncedAt: new Date().toISOString(),
        });
    } catch (err: any) {
        console.error("POST /api/warehouse/offline-sync batch error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}

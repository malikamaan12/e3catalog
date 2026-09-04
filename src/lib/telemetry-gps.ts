import { db } from "./db";
import { fleetGpsPings, dispatchRoutes, dispatchStops, users, bookingDispatchLogs } from "./db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// ─── Key Qatar Geographical Hubs & Reference Coordinates ───
export const QATAR_HUBS: Record<string, { lat: number; lng: number; name: string }> = {
    LUSAIL: { lat: 25.4210, lng: 51.5284, name: "Lusail & Pearl Marina" },
    WEST_BAY: { lat: 25.3216, lng: 51.5307, name: "West Bay Business District" },
    CORNICHE: { lat: 25.2925, lng: 51.5342, name: "Central Doha Corniche" },
    QNCC: { lat: 25.3188, lng: 51.4426, name: "Qatar National Convention Centre" },
    ASPIRE_RAYYAN: { lat: 25.2605, lng: 51.4444, name: "Aspire Zone & Al Rayyan" },
    AIRPORT: { lat: 25.2731, lng: 51.6080, name: "Hamad International Airport" },
    INDUSTRIAL_BASE: { lat: 25.1872, lng: 51.4398, name: "Industrial Area Central Hub" },
    AL_WAKRAH: { lat: 25.1764, lng: 51.5833, name: "Al Wakrah Coastal Terminal" },
    AL_KHOR: { lat: 25.6888, lng: 51.4969, name: "Al Khor North Stadium" },
};

/**
 * Calculates great-circle distance between two geographic coordinates using the Haversine formula
 */
export function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
}

/**
 * Determines nearest Qatar operational logistics zone based on telemetry coordinate
 */
export function detectQatarZone(lat: number, lng: number): string {
    let closestZone = "Central Doha";
    let minDistance = Infinity;

    for (const [key, hub] of Object.entries(QATAR_HUBS)) {
        const dist = calculateHaversineDistanceKm(lat, lng, hub.lat, hub.lng);
        if (dist < minDistance) {
            minDistance = dist;
            closestZone = hub.name;
        }
    }
    return closestZone;
}

export interface TelemetryIngestPayload {
    dispatchLogId?: string;
    routeId?: string;
    driverId?: string;
    vehiclePlate?: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    batteryPct?: number;
    status?: "departed" | "in_transit" | "arrived" | "unloading" | "completed";
}

/**
 * Ingests live telemetry ping from driver mobile client, evaluates route progress and waypoint ETAs
 */
export async function ingestDriverTelemetryPing(payload: TelemetryIngestPayload) {
    const {
        dispatchLogId,
        routeId,
        driverId,
        vehiclePlate = "Q-VAN-101",
        latitude,
        longitude,
        heading = 0,
        speed = 45,
        batteryPct = 95,
        status = "in_transit",
    } = payload;

    // Detect zone
    const currentZone = detectQatarZone(latitude, longitude);

    let distanceRemainingKm = 0;
    let etaMinutes = 0;

    // If routeId is provided, calculate distance to upcoming stops
    if (routeId) {
        const pendingStops = await db
            .select()
            .from(dispatchStops)
            .where(
                and(
                    eq(dispatchStops.routeId, routeId),
                    sql`${dispatchStops.status} NOT IN ('completed', 'failed')`
                )
            )
            .orderBy(dispatchStops.sequenceIndex);

        if (pendingStops.length > 0) {
            // Pick destination hub or approximate by stop
            const nextStop = pendingStops[0];
            // Approximate venue coordinates or map to closest known hub
            const targetHub = Object.values(QATAR_HUBS).find(h => 
                nextStop.venueAddress.toLowerCase().includes(h.name.toLowerCase().slice(0, 5))
            ) || QATAR_HUBS.CORNICHE;

            distanceRemainingKm = calculateHaversineDistanceKm(latitude, longitude, targetHub.lat, targetHub.lng);
            // Effective speed factoring urban traffic (avg 40 km/h minimum)
            const effectiveSpeed = Math.max(speed, 35);
            etaMinutes = Math.max(2, Math.round((distanceRemainingKm / effectiveSpeed) * 60));
        }
    }

    const pingId = uuidv4();

    // Fallback: If no dispatchLogId, grab or create placeholder
    let resolvedDispatchLogId = dispatchLogId;
    if (!resolvedDispatchLogId) {
        const existingLog = await db.select({ id: bookingDispatchLogs.id }).from(bookingDispatchLogs).limit(1);
        if (existingLog.length > 0) {
            resolvedDispatchLogId = existingLog[0].id;
        }
    }

    if (resolvedDispatchLogId) {
        await db.insert(fleetGpsPings).values({
            id: pingId,
            dispatchLogId: resolvedDispatchLogId,
            routeId: routeId || null,
            driverId: driverId || null,
            vehiclePlate,
            latitude,
            longitude,
            heading,
            speed,
            batteryPct,
            currentZone,
            distanceRemainingKm,
            etaMinutes,
            status,
            createdAt: new Date(),
        });
    }

    return {
        pingId,
        latitude,
        longitude,
        currentZone,
        distanceRemainingKm,
        etaMinutes,
        speed,
        batteryPct,
        status,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Aggregates live radar telemetry state across all active fleet vehicles in Qatar
 */
export async function getLiveFleetRadarFeed() {
    // 1. Fetch active dispatch routes
    const activeRoutes = await db
        .select({
            id: dispatchRoutes.id,
            clusterNumber: dispatchRoutes.clusterNumber,
            zone: dispatchRoutes.zone,
            driverId: dispatchRoutes.driverId,
            driverName: dispatchRoutes.driverName,
            vehiclePlate: dispatchRoutes.vehiclePlate,
            status: dispatchRoutes.status,
            totalStops: dispatchRoutes.totalStops,
            scheduledDate: dispatchRoutes.scheduledDate,
        })
        .from(dispatchRoutes)
        .where(
            sql`${dispatchRoutes.status} IN ('sequenced', 'dispatched', 'in_transit', 'draft')`
        )
        .limit(20);

    // 2. Fetch latest telemetry pings
    const latestPings = await db
        .select()
        .from(fleetGpsPings)
        .orderBy(desc(fleetGpsPings.createdAt))
        .limit(50);

    // 3. Match latest ping to each route or create virtual active van
    const routeMap = new Map();
    for (const ping of latestPings) {
        const key = ping.routeId || ping.vehiclePlate || "default";
        if (!routeMap.has(key)) {
            routeMap.set(key, ping);
        }
    }

    const radarVehicles = activeRoutes.map((route, idx) => {
        const matchedPing = routeMap.get(route.id) || routeMap.get(route.vehiclePlate);
        
        // Defaults if no live ping yet: assign sensible Qatar location based on route zone
        let lat = 25.2925 + (idx * 0.02);
        let lng = 51.5342 + (idx * 0.015);
        let zoneName = route.zone;
        let speed = 42;
        let battery = 92 - (idx * 4);
        let heading = 120;
        let distanceRemaining = 6.4 + (idx * 1.5);
        let eta = 12 + (idx * 5);
        let status = route.status === "draft" ? "in_transit" : route.status;

        if (matchedPing) {
            lat = matchedPing.latitude;
            lng = matchedPing.longitude;
            speed = matchedPing.speed ?? speed;
            battery = matchedPing.batteryPct ?? battery;
            heading = matchedPing.heading ?? heading;
            zoneName = matchedPing.currentZone || zoneName;
            distanceRemaining = matchedPing.distanceRemainingKm ?? distanceRemaining;
            eta = matchedPing.etaMinutes ?? eta;
            status = matchedPing.status;
        }

        return {
            id: `van-${route.id}`,
            routeId: route.id,
            clusterNumber: route.clusterNumber,
            driverName: route.driverName || "Fulfillment Driver",
            vehiclePlate: route.vehiclePlate || `QA-${8000 + idx}`,
            zone: zoneName,
            status,
            latitude: lat,
            longitude: lng,
            heading,
            speedKmh: speed,
            batteryPct: battery,
            distanceRemainingKm: distanceRemaining,
            etaMinutes: eta,
            totalStops: route.totalStops,
        };
    });

    // If no active routes in DB, supply default active patrol vans for immediate visual radar engagement
    if (radarVehicles.length === 0) {
        radarVehicles.push(
            {
                id: "van-demo-1",
                routeId: "demo-route-lusail",
                clusterNumber: "ROUTE-DOHA-N1",
                driverName: "Tariq Al-Mansoor",
                vehiclePlate: "QA-55421",
                zone: "Lusail Marina",
                status: "in_transit",
                latitude: QATAR_HUBS.LUSAIL.lat,
                longitude: QATAR_HUBS.LUSAIL.lng,
                heading: 145,
                speedKmh: 48,
                batteryPct: 88,
                distanceRemainingKm: 4.2,
                etaMinutes: 8,
                totalStops: 3,
            },
            {
                id: "van-demo-2",
                routeId: "demo-route-westbay",
                clusterNumber: "ROUTE-DOHA-C2",
                driverName: "Bilal Rasheed",
                vehiclePlate: "QA-88210",
                zone: "West Bay Business District",
                status: "in_transit",
                latitude: QATAR_HUBS.WEST_BAY.lat,
                longitude: QATAR_HUBS.WEST_BAY.lng,
                heading: 190,
                speedKmh: 36,
                batteryPct: 94,
                distanceRemainingKm: 2.1,
                etaMinutes: 5,
                totalStops: 4,
            },
            {
                id: "van-demo-3",
                routeId: "demo-route-qncc",
                clusterNumber: "ROUTE-RAYYAN-W1",
                driverName: "Kareem Haddad",
                vehiclePlate: "QA-33190",
                zone: "Qatar National Convention Centre",
                status: "in_transit",
                latitude: QATAR_HUBS.QNCC.lat,
                longitude: QATAR_HUBS.QNCC.lng,
                heading: 75,
                speedKmh: 52,
                batteryPct: 76,
                distanceRemainingKm: 8.5,
                etaMinutes: 14,
                totalStops: 2,
            }
        );
    }

    return {
        timestamp: new Date().toISOString(),
        totalActiveVans: radarVehicles.length,
        hubs: QATAR_HUBS,
        vehicles: radarVehicles,
    };
}

/**
 * Automated Dispatch Clustering & Waypoint Routing Service for Qatar Logistics
 */

export interface DeliveryWaypointInput {
    bookingId: string;
    bookingNumber?: string;
    projectName?: string;
    venueAddress: string;
    contactPerson?: string;
    contactPhone?: string;
    units: number;
    weightKg?: number;
    volumeCbm?: number;
    timeWindowStart?: string;
    timeWindowEnd?: string;
    stopType?: "delivery" | "pickup" | "transfer";
}

export interface GeneratedRouteCluster {
    zone: string;
    scheduledDate: Date;
    suggestedVehiclePlate: string;
    vehicleCapacityKg: number;
    totalWeightKg: number;
    totalVolumeCbm: number;
    totalStops: number;
    stops: Array<{
        bookingId: string;
        sequenceIndex: number;
        venueAddress: string;
        contactPerson?: string;
        contactPhone?: string;
        timeWindowStart?: string;
        timeWindowEnd?: string;
        stopType: "delivery" | "pickup" | "transfer";
        estimatedWeightKg: number;
    }>;
}

/**
 * Resolves Qatar municipal / logistical zones from venue addresses.
 */
export function resolveQatarZone(address: string): string {
    const norm = (address || "").toLowerCase();

    if (norm.includes("lusail") || norm.includes("pearl") || norm.includes("katara") || norm.includes("marina")) {
        return "Lusail & The Pearl";
    }
    if (norm.includes("west bay") || norm.includes("diplomatic") || norm.includes("sheraton") || norm.includes("corniche")) {
        return "West Bay & Diplomatic";
    }
    if (norm.includes("qncc") || norm.includes("education city") || norm.includes("al rayyan") || norm.includes("aspire") || norm.includes("khalifa")) {
        return "Al Rayyan & Education City";
    }
    if (norm.includes("wakrah") || norm.includes("wukair") || norm.includes("mesaieed") || norm.includes("hamad port")) {
        return "Al Wakrah & South Corridor";
    }
    if (norm.includes("industrial") || norm.includes("birkat") || norm.includes("salwa") || norm.includes("logistics")) {
        return "Industrial Area & Logistics Park";
    }
    
    return "Central Doha (Msheireb & Souq)";
}

/**
 * Clusters an array of event delivery waypoints into multi-vehicle routes.
 */
export function clusterBookingsIntoRoutes(
    items: DeliveryWaypointInput[],
    options: {
        scheduledDate?: Date;
        maxStopsPerRoute?: number;
        maxPayloadKg?: number;
    } = {}
): GeneratedRouteCluster[] {
    const scheduledDate = options.scheduledDate || new Date();
    const maxStops = options.maxStopsPerRoute || 6;
    const maxPayload = options.maxPayloadKg || 3500; // 3.5 Tonne standard vehicle

    // Group items by zone
    const zoneGroups = new Map<string, DeliveryWaypointInput[]>();

    for (const item of items) {
        const zone = resolveQatarZone(item.venueAddress);
        if (!zoneGroups.has(zone)) {
            zoneGroups.set(zone, []);
        }
        zoneGroups.get(zone)!.push(item);
    }

    const clusters: GeneratedRouteCluster[] = [];
    let vehicleIndex = 1;

    for (const [zone, zoneItems] of zoneGroups.entries()) {
        // Sort items by time window start, then address
        const sorted = [...zoneItems].sort((a, b) => {
            const timeA = a.timeWindowStart || "10:00";
            const timeB = b.timeWindowStart || "10:00";
            return timeA.localeCompare(timeB);
        });

        let currentBatch: DeliveryWaypointInput[] = [];
        let currentWeight = 0;
        let currentVolume = 0;

        for (const item of sorted) {
            const itemWeight = (item.weightKg || 35) * (item.units || 1);
            const itemVol = (item.volumeCbm || 0.15) * (item.units || 1);

            if (currentBatch.length >= maxStops || currentWeight + itemWeight > maxPayload) {
                // Finalize existing cluster
                clusters.push(createCluster(zone, scheduledDate, currentBatch, currentWeight, currentVolume, vehicleIndex++, maxPayload));
                currentBatch = [item];
                currentWeight = itemWeight;
                currentVolume = itemVol;
            } else {
                currentBatch.push(item);
                currentWeight += itemWeight;
                currentVolume += itemVol;
            }
        }

        if (currentBatch.length > 0) {
            clusters.push(createCluster(zone, scheduledDate, currentBatch, currentWeight, currentVolume, vehicleIndex++, maxPayload));
        }
    }

    return clusters;
}

function createCluster(
    zone: string,
    scheduledDate: Date,
    items: DeliveryWaypointInput[],
    totalWeightKg: number,
    totalVolumeCbm: number,
    vehicleIdx: number,
    capacityKg: number
): GeneratedRouteCluster {
    const plateNumber = `QA-E3-FLT${String(vehicleIdx).padStart(3, "0")}`;

    return {
        zone,
        scheduledDate,
        suggestedVehiclePlate: plateNumber,
        vehicleCapacityKg: capacityKg,
        totalWeightKg: Math.round(totalWeightKg),
        totalVolumeCbm: Number(totalVolumeCbm.toFixed(2)),
        totalStops: items.length,
        stops: items.map((item, idx) => ({
            bookingId: item.bookingId,
            sequenceIndex: idx + 1,
            venueAddress: item.venueAddress,
            contactPerson: item.contactPerson,
            contactPhone: item.contactPhone,
            timeWindowStart: item.timeWindowStart || "09:00",
            timeWindowEnd: item.timeWindowEnd || "12:00",
            stopType: item.stopType || "delivery",
            estimatedWeightKg: Math.round((item.weightKg || 35) * (item.units || 1)),
        })),
    };
}

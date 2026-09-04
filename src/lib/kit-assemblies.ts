import { db } from "./db";
import { flightCases, flightCaseContents, kitMissingItemClaims, inventoryUnits, products, bookings, users } from "./db/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Standard Accessory Penalty Schedule (QAR)
export const STANDARD_ACCESSORY_PENALTIES: Record<string, number> = {
    "Powercon / True1 Cable": 180,
    "Heavy Duty DMX Cable (20m)": 220,
    "Wireless Mic BNC Antenna": 350,
    "Quick-Trigger Stage Clamp": 280,
    "Flight Case Locking Pin / Latch": 150,
    "HDMI 4K Fiber Optic Cable (30m)": 650,
    "Power Distribution Breakout Box": 850,
    "Default Missing Accessory": 200,
};

export interface CreateFlightCaseInput {
    caseNumber: string;
    name: string;
    caseType?: string;
    assetTagCode: string;
    rfidTag?: string;
    tareWeightKg?: number;
    maxCapacityKg?: number;
    warehouseLocation?: string;
    notes?: string;
}

/**
 * Creates and registers a new master flight case in the warehouse catalog
 */
export async function createFlightCase(input: CreateFlightCaseInput) {
    const id = uuidv4();
    await db.insert(flightCases).values({
        id,
        caseNumber: input.caseNumber,
        name: input.name,
        caseType: input.caseType || "Heavy Duty Trunk",
        assetTagCode: input.assetTagCode,
        rfidTag: input.rfidTag || null,
        tareWeightKg: input.tareWeightKg ?? 18,
        maxCapacityKg: input.maxCapacityKg ?? 100,
        status: "available",
        warehouseLocation: input.warehouseLocation || "Zone A - Bay 1",
        notes: input.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    return { id, ...input, status: "available" };
}

export interface AssignCaseContentInput {
    inventoryUnitId?: string;
    productId?: string;
    accessoryName: string;
    expectedQuantity?: number;
    isPermanentChild?: boolean;
}

/**
 * Assigns serialized units or child sub-assembly accessories into a master flight case
 */
export async function assignCaseContents(flightCaseId: string, items: AssignCaseContentInput[]) {
    const records = items.map(item => ({
        id: uuidv4(),
        flightCaseId,
        inventoryUnitId: item.inventoryUnitId || null,
        productId: item.productId || null,
        accessoryName: item.accessoryName,
        expectedQuantity: item.expectedQuantity ?? 1,
        isPermanentChild: item.isPermanentChild ?? false,
        isVerifiedPacked: true,
        verifiedAt: new Date(),
    }));

    if (records.length > 0) {
        await db.insert(flightCaseContents).values(records);
    }
    return records;
}

/**
 * Single-scan checkout or pack verification
 * Scanning master flight case asset tag verifies all child items or flags missing ones
 */
export async function verifyFlightCasePack(params: {
    flightCaseId: string;
    scannedTags?: string[];
    verifiedBy?: string;
}) {
    const { flightCaseId, scannedTags = [], verifiedBy } = params;

    // Fetch flight case and its manifest
    const [flightCase] = await db.select().from(flightCases).where(eq(flightCases.id, flightCaseId));
    if (!flightCase) throw new Error("Flight case not found");

    const contents = await db
        .select({
            id: flightCaseContents.id,
            accessoryName: flightCaseContents.accessoryName,
            expectedQuantity: flightCaseContents.expectedQuantity,
            isPermanentChild: flightCaseContents.isPermanentChild,
            inventoryUnitId: flightCaseContents.inventoryUnitId,
            assetTagCode: inventoryUnits.assetTagCode,
        })
        .from(flightCaseContents)
        .leftJoin(inventoryUnits, eq(flightCaseContents.inventoryUnitId, inventoryUnits.id))
        .where(eq(flightCaseContents.flightCaseId, flightCaseId));

    // If master tag was scanned or empty list, treat as single-scan comprehensive bundle pack
    const isSingleScanPack = scannedTags.length === 0 || scannedTags.includes(flightCase.assetTagCode);

    const verifiedItemIds: string[] = [];
    const missingItems: typeof contents = [];

    for (const item of contents) {
        if (isSingleScanPack || (item.assetTagCode && scannedTags.includes(item.assetTagCode))) {
            verifiedItemIds.push(item.id);
        } else {
            missingItems.push(item);
        }
    }

    if (verifiedItemIds.length > 0) {
        await db
            .update(flightCaseContents)
            .set({
                isVerifiedPacked: true,
                verifiedAt: new Date(),
                verifiedBy: verifiedBy || null,
            })
            .where(inArray(flightCaseContents.id, verifiedItemIds));
    }

    const newStatus = missingItems.length === 0 ? "packed" : "available";
    await db
        .update(flightCases)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(flightCases.id, flightCaseId));

    return {
        flightCaseId,
        caseNumber: flightCase.caseNumber,
        isFullyPacked: missingItems.length === 0,
        status: newStatus,
        totalItems: contents.length,
        verifiedCount: verifiedItemIds.length,
        missingItems: missingItems.map(m => m.accessoryName),
    };
}

/**
 * Return audit: checks return of flight case from venue, automatically detecting missing accessories and generating claims
 */
export async function verifyFlightCaseReturn(params: {
    flightCaseId: string;
    returnedTags?: string[];
    bookingId?: string;
    filedBy?: string;
}) {
    const { flightCaseId, returnedTags = [], bookingId, filedBy } = params;

    const [flightCase] = await db.select().from(flightCases).where(eq(flightCases.id, flightCaseId));
    if (!flightCase) throw new Error("Flight case not found");

    const contents = await db
        .select({
            id: flightCaseContents.id,
            accessoryName: flightCaseContents.accessoryName,
            expectedQuantity: flightCaseContents.expectedQuantity,
            inventoryUnitId: flightCaseContents.inventoryUnitId,
            assetTagCode: inventoryUnits.assetTagCode,
        })
        .from(flightCaseContents)
        .leftJoin(inventoryUnits, eq(flightCaseContents.inventoryUnitId, inventoryUnits.id))
        .where(eq(flightCaseContents.flightCaseId, flightCaseId));

    // Determine missing items
    const generatedClaims = [];
    for (const item of contents) {
        const isReturned = item.assetTagCode
            ? returnedTags.includes(item.assetTagCode)
            : (returnedTags.includes(item.accessoryName) || returnedTags.includes(item.id) || returnedTags.includes(flightCase.assetTagCode));
        if (!isReturned) {
            const penaltyFee = STANDARD_ACCESSORY_PENALTIES[item.accessoryName] || STANDARD_ACCESSORY_PENALTIES["Default Missing Accessory"];
            const claimId = uuidv4();
            await db.insert(kitMissingItemClaims).values({
                id: claimId,
                bookingId: bookingId || null,
                flightCaseId,
                inventoryUnitId: item.inventoryUnitId || null,
                itemName: item.accessoryName,
                penaltyFee,
                status: "open",
                claimNotes: `Missing during return inspection of Flight Case ${flightCase.caseNumber}`,
                filedBy: filedBy || null,
                createdAt: new Date(),
            });

            generatedClaims.push({
                claimId,
                itemName: item.accessoryName,
                penaltyFee,
            });
        }
    }

    const nextStatus = generatedClaims.length > 0 ? "unpacking_audit" : "available";
    await db
        .update(flightCases)
        .set({ status: nextStatus, updatedAt: new Date() })
        .where(eq(flightCases.id, flightCaseId));

    return {
        flightCaseId,
        caseNumber: flightCase.caseNumber,
        status: nextStatus,
        missingClaimsCount: generatedClaims.length,
        claims: generatedClaims,
    };
}

/**
 * Resolves a missing accessory claim (deduct from security deposit, generate invoice, or waive)
 */
export async function resolveMissingItemClaim(claimId: string, resolution: {
    action: "deducted_from_deposit" | "invoiced" | "waived" | "resolved";
    notes?: string;
}) {
    const [existingClaim] = await db.select().from(kitMissingItemClaims).where(eq(kitMissingItemClaims.id, claimId));
    const updatedNotes = resolution.notes
        ? (existingClaim?.claimNotes ? `${existingClaim.claimNotes} | ${resolution.notes}` : resolution.notes)
        : existingClaim?.claimNotes;

    await db
        .update(kitMissingItemClaims)
        .set({
            status: resolution.action,
            claimNotes: updatedNotes,
            resolvedAt: new Date(),
        })
        .where(eq(kitMissingItemClaims.id, claimId));

    return { claimId, status: resolution.action, resolvedAt: new Date() };
}

/**
 * Returns flight case manifest and child items
 */
export async function getFlightCaseManifest(flightCaseId: string) {
    const [flightCase] = await db.select().from(flightCases).where(eq(flightCases.id, flightCaseId));
    if (!flightCase) return null;

    const contents = await db
        .select({
            id: flightCaseContents.id,
            accessoryName: flightCaseContents.accessoryName,
            expectedQuantity: flightCaseContents.expectedQuantity,
            isPermanentChild: flightCaseContents.isPermanentChild,
            isVerifiedPacked: flightCaseContents.isVerifiedPacked,
            verifiedAt: flightCaseContents.verifiedAt,
            inventoryUnitId: flightCaseContents.inventoryUnitId,
            assetTagCode: inventoryUnits.assetTagCode,
            productName: products.name,
        })
        .from(flightCaseContents)
        .leftJoin(inventoryUnits, eq(flightCaseContents.inventoryUnitId, inventoryUnits.id))
        .leftJoin(products, eq(flightCaseContents.productId, products.id))
        .where(eq(flightCaseContents.flightCaseId, flightCaseId));

    const claims = await db
        .select()
        .from(kitMissingItemClaims)
        .where(eq(kitMissingItemClaims.flightCaseId, flightCaseId))
        .orderBy(desc(kitMissingItemClaims.createdAt));

    return {
        ...flightCase,
        contents,
        claims,
    };
}

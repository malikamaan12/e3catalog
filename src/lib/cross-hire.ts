/**
 * E3 Rentals — Automated Cross-Hire & Vendor Partner Sub-Rental Engine
 * 
 * Features:
 * - Detects booking shortages where demand exceeds available inventory units
 * - Dispatches automated sub-rental RFPs with target commercial profit margins
 * - Inbound receiving of third-party rental equipment with barcode aliasing (XHIRE-ALIAS-...)
 * - Unified dispatch mapping so sub-rentals scan through warehouse fulfillment cleanly
 * - Post-event courier return coordination
 */

import { db } from "./db";
import { 
    bookings, 
    products, 
    inventoryUnits, 
    crossHireOrders, 
    vendors, 
    users 
} from "./db/schema";
import { eq, and, inArray, gte, lte, desc } from "drizzle-orm";
import { differenceInCalendarDays } from "date-fns";
import { v4 as uuid } from "uuid";

export interface ShortageReport {
    productId: string;
    productName: string;
    categoryName?: string;
    totalStock: number;
    unitsRequired: number;
    unitsAvailable: number;
    shortageDelta: number;
    recommendedSupplierCost: number;
    recommendedClientPrice: number;
    estimatedMargin: number;
}

/**
 * Detects inventory equipment shortages for a given booking or date window.
 */
export async function detectBookingShortages(bookingId: string): Promise<ShortageReport[]> {
    const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);

    if (!booking) {
        throw new Error(`Booking ${bookingId} not found`);
    }

    const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, booking.productId))
        .limit(1);

    if (!product) {
        return [];
    }

    // Count physical available units in warehouse
    const totalUnitsCount = await db
        .select()
        .from(inventoryUnits)
        .where(
            and(
                eq(inventoryUnits.productId, product.id),
                eq(inventoryUnits.conditionStatus, "excellent")
            )
        );

    const availableUnitsCount = totalUnitsCount.filter(
        u => u.availabilityStatus === "in_warehouse"
    ).length;

    const requiredUnits = booking.units || 1;
    const shortageDelta = Math.max(0, requiredUnits - availableUnitsCount);

    const clientDailyRate = Number(product.pricePerDay) || 300;
    // Standard industry sub-rental cost is ~65-75% of retail rate, yielding 25-35% gross margin
    const recommendedSupplierCost = Math.round(clientDailyRate * 0.72);
    const estimatedMargin = clientDailyRate - recommendedSupplierCost;

    if (shortageDelta > 0) {
        return [{
            productId: product.id,
            productName: product.name,
            totalStock: totalUnitsCount.length,
            unitsRequired: requiredUnits,
            unitsAvailable: availableUnitsCount,
            shortageDelta,
            recommendedSupplierCost,
            recommendedClientPrice: clientDailyRate,
            estimatedMargin,
        }];
    }

    return [];
}

/**
 * Creates an official Sub-Rental Purchase Order / RFP to a vendor partner.
 */
export async function createSubRentalRfp(params: {
    bookingId?: string;
    productId: string;
    supplierVendorId?: string;
    supplierName: string;
    supplierContact?: string;
    unitsRequested: number;
    periodStart: Date;
    periodEnd: Date;
    supplierDailyRate: number;
    clientDailyRate: number;
    notes?: string;
    createdById?: string;
}) {
    const days = Math.max(1, differenceInCalendarDays(params.periodEnd, params.periodStart));
    const units = Math.max(1, params.unitsRequested);
    const totalSupplierCost = days * units * params.supplierDailyRate;
    const totalClientRevenue = days * units * params.clientDailyRate;
    const profitMargin = totalClientRevenue - totalSupplierCost;

    const orderId = uuid();
    const orderNumber = `XHIRE-${Date.now().toString(36).toUpperCase()}`;

    const [order] = await db.insert(crossHireOrders).values({
        id: orderId,
        orderNumber,
        bookingId: params.bookingId || null,
        supplierVendorId: params.supplierVendorId || null,
        supplierName: params.supplierName,
        supplierContact: params.supplierContact || null,
        productId: params.productId,
        unitsRequested: units,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        supplierDailyRate: params.supplierDailyRate,
        clientDailyRate: params.clientDailyRate,
        totalSupplierCost,
        totalClientRevenue,
        profitMargin,
        status: "requested",
        assetTagAllocations: [],
        notes: params.notes || "Auto-generated Sub-Rental RFP via Shortage Detector",
        createdById: params.createdById || null,
    }).returning();

    return order;
}

/**
 * Inbound receiving of sub-rental gear at warehouse loading dock.
 * Generates an aliased asset tag (e.g. XHIRE-ALIAS-...) and inserts a temporary inventory unit
 * so the warehouse fulfillment scanner recognizes it immediately without schema mismatch.
 */
export async function receiveSubRentalUnit(params: {
    crossHireOrderId: string;
    vendorSerial?: string;
    warehouseLocation?: string;
    condition?: string;
    customAliasTag?: string;
}) {
    const [order] = await db
        .select()
        .from(crossHireOrders)
        .where(eq(crossHireOrders.id, params.crossHireOrderId))
        .limit(1);

    if (!order) {
        throw new Error(`Cross-hire order ${params.crossHireOrderId} not found`);
    }

    const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, order.productId))
        .limit(1);

    let vendorId = order.supplierVendorId || product?.vendorId;
    if (!vendorId) {
        const [anyVendor] = await db.select({ id: vendors.id }).from(vendors).limit(1);
        vendorId = anyVendor?.id || "vendor-default";
    }

    const aliasTag = params.customAliasTag || `XHIRE-${order.orderNumber.replace(/[^A-Z0-9]/g, '')}-${((order.assetTagAllocations || []).length + 1).toString().padStart(2, '0')}`;
    const unitId = uuid();

    // Create aliased inventory unit
    const [unit] = await db.insert(inventoryUnits).values({
        id: unitId,
        productId: order.productId,
        vendorId,
        assetTagCode: aliasTag,
        serialNumber: params.vendorSerial || `SN-EXT-${Date.now().toString(36).toUpperCase()}`,
        conditionStatus: params.condition || "excellent",
        availabilityStatus: "in_warehouse",
        warehouseLocation: params.warehouseLocation || "Bay 04 - Sub-Rental Staging",
    }).returning();

    // Update cross-hire order allocations
    const currentAllocations = order.assetTagAllocations || [];
    const updatedAllocations = [...currentAllocations, aliasTag];

    await db.update(crossHireOrders)
        .set({
            assetTagAllocations: updatedAllocations,
            status: updatedAllocations.length >= order.unitsRequested ? "received" : "confirmed",
            updatedAt: new Date(),
        })
        .where(eq(crossHireOrders.id, order.id));

    return {
        unit,
        aliasTag,
        orderId: order.id,
        isFullyReceived: updatedAllocations.length >= order.unitsRequested,
    };
}

/**
 * Flags sub-rented equipment as returned and ready for supplier courier pickup.
 */
export async function finalizeSubRentalReturn(crossHireOrderId: string) {
    const [order] = await db
        .select()
        .from(crossHireOrders)
        .where(eq(crossHireOrders.id, crossHireOrderId))
        .limit(1);

    if (!order) throw new Error("Order not found");

    // Update cross hire status
    await db.update(crossHireOrders)
        .set({ status: "returned", updatedAt: new Date() })
        .where(eq(crossHireOrders.id, crossHireOrderId));

    // Mark aliased units
    if (order.assetTagAllocations && order.assetTagAllocations.length > 0) {
        await db.update(inventoryUnits)
            .set({ availabilityStatus: "in_warehouse", conditionStatus: "excellent", updatedAt: new Date() })
            .where(inArray(inventoryUnits.assetTagCode, order.assetTagAllocations));
    }

    return { success: true, message: `Sub-rental ${order.orderNumber} marked returned to ${order.supplierName}.` };
}

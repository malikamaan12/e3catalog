/**
 * Sub-Rental & Cross-Hire Network Engine
 * Sourcing, shortage detection, and B2B Purchase Order margin generator.
 */

import { db } from "@/lib/db";
import { crossHireOrders, products, inventoryUnits, bookings } from "@/lib/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { differenceInCalendarDays } from "date-fns";
import { v4 as uuid } from "uuid";

export interface CrossHireSourcingParams {
    bookingId?: string;
    productId: string;
    unitsNeeded: number;
    startDate: Date | string;
    endDate: Date | string;
    supplierVendorId?: string;
    supplierName: string;
    supplierContact?: string;
    supplierDailyRate: number;
    clientDailyRate: number;
    notes?: string;
    createdById?: string;
}

/**
 * Calculates financial margins and generates a B2B Cross-Hire Purchase Order.
 */
export async function createCrossHireOrder(params: CrossHireSourcingParams) {
    const {
        bookingId,
        productId,
        unitsNeeded,
        startDate,
        endDate,
        supplierVendorId,
        supplierName,
        supplierContact,
        supplierDailyRate,
        clientDailyRate,
        notes,
        createdById,
    } = params;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
    const units = Math.max(1, unitsNeeded);

    const totalSupplierCost = Math.round(supplierDailyRate * units * days * 100) / 100;
    const totalClientRevenue = Math.round(clientDailyRate * units * days * 100) / 100;
    const profitMargin = Math.round((totalClientRevenue - totalSupplierCost) * 100) / 100;

    const orderNumber = `XHIRE-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const id = uuid();

    await db.insert(crossHireOrders).values({
        id,
        orderNumber,
        bookingId: bookingId || null,
        supplierVendorId: supplierVendorId || null,
        supplierName,
        supplierContact: supplierContact || null,
        productId,
        unitsRequested: units,
        periodStart: start,
        periodEnd: end,
        supplierDailyRate,
        clientDailyRate,
        totalSupplierCost,
        totalClientRevenue,
        profitMargin,
        status: "requested",
        notes: notes || "Automated Cross-Hire Sourcing via E3 Partner Network",
        createdById: createdById || null,
    });

    const order = await db.query.crossHireOrders.findFirst({
        where: eq(crossHireOrders.id, id),
        with: {
            product: true,
            supplierVendor: true,
            booking: true,
        },
    });

    return {
        success: true,
        orderNumber,
        order,
        days,
        totalSupplierCost,
        totalClientRevenue,
        profitMargin,
    };
}

/**
 * Calculates profit margin and markup metrics for cross-hire partner quotes.
 */
export function calculateCrossHireMargin(params: {
    supplierCost: number;
    clientPrice: number;
}) {
    const grossProfit = Math.round((params.clientPrice - params.supplierCost) * 100) / 100;
    const marginPercentage = params.clientPrice > 0 ? Math.round((grossProfit / params.clientPrice) * 10000) / 100 : 0;
    const markupPercentage = params.supplierCost > 0 ? Math.round((grossProfit / params.supplierCost) * 10000) / 100 : 0;

    return {
        grossProfit,
        marginPercentage,
        markupPercentage,
    };
}


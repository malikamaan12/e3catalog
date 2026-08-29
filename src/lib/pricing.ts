/**
 * E3 Rentals — Authoritative Pricing Engine
 * 
 * Centralized, deterministic server-side pricing service used across:
 * - Cart calculation & validation
 * - Quote submissions & deal rooms
 * - Proposal generation & Client sign-off
 * - Quote Proposal & Transport Manifest PDFs
 * - Commission & Vendor settlement ledgers
 */

export interface PricingLineItem {
    id?: string;
    productId: string;
    name?: string;
    units: number;
    pricePerDay: number;
    startDate: string | Date;
    endDate: string | Date;
    showPrice?: boolean;
    packagingFee?: number;
    handlingFee?: number;
    setupFee?: number;
    vendorId?: string | null;
}

export interface CalculatedLineItem extends PricingLineItem {
    days: number;
    unitPrice: number;
    rentalTotal: number;
    customFees: number;
    totalLineAmount: number;
}

export interface QuoteFinancials {
    items: CalculatedLineItem[];
    totalUnitsCount: number;
    totalRentalDays: number;
    baseRentalSubtotal: number;
    totalCustomFees: number;
    grossSubtotal: number;
    discountPercent: number;
    discountAmount: number;
    netSubtotal: number;
    logisticsCost: number;
    laborCost: number;
    additionalChargeName: string | null;
    additionalChargeAmount: number;
    additionalChargeType: "fixed" | "percent" | "per_unit" | "per_day";
    additionalChargeCalculated: number;
    grandTotal: number;
    hasUnpricedItems: boolean;
}

/**
 * Calculates inclusive calendar days between rental start and end dates.
 * e.g., 2026-09-01 to 2026-09-01 = 1 Day
 * e.g., 2026-09-01 to 2026-09-03 = 3 Days
 */
export function calculateRentalDays(start: string | Date, end: string | Date): number {
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return 1;
    }

    const s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return Math.max(1, diffDays);
}

/**
 * Deterministically rounds currency values to 2 decimal places.
 */
export function roundCurrency(amount: number): number {
    return Math.round((Number(amount) || 0) * 100) / 100;
}

/**
 * Calculates complete quote financials from raw items, fees, and discounts.
 */
export function calculateQuoteFinancials(params: {
    items: PricingLineItem[];
    discountPercent?: number;
    discountFixed?: number;
    logisticsCost?: number;
    laborCost?: number;
    additionalChargeName?: string | null;
    additionalChargeAmount?: number;
    additionalChargeType?: "fixed" | "percent" | "per_unit" | "per_day";
}): QuoteFinancials {
    const {
        items,
        discountPercent = 0,
        discountFixed = 0,
        logisticsCost = 0,
        laborCost = 0,
        additionalChargeName = null,
        additionalChargeAmount = 0,
        additionalChargeType = "fixed",
    } = params;

    let baseRentalSubtotal = 0;
    let totalCustomFees = 0;
    let totalUnitsCount = 0;
    let maxDays = 1;
    let hasUnpricedItems = false;

    const calculatedItems: CalculatedLineItem[] = items.map((item) => {
        const days = calculateRentalDays(item.startDate, item.endDate);
        if (days > maxDays) maxDays = days;

        const units = Math.max(1, Number(item.units) || 1);
        totalUnitsCount += units;

        const unitPrice = roundCurrency(Number(item.pricePerDay) || 0);
        const isPriced = item.showPrice !== false;
        if (!isPriced) hasUnpricedItems = true;

        const rentalTotal = isPriced ? roundCurrency(unitPrice * units * days) : 0;
        
        const pkgFee = (Number(item.packagingFee) || 0) * units;
        const hndFee = (Number(item.handlingFee) || 0) * units;
        const setFee = (Number(item.setupFee) || 0) * units;
        const customFees = roundCurrency(pkgFee + hndFee + setFee);

        if (isPriced) {
            baseRentalSubtotal += rentalTotal;
            totalCustomFees += customFees;
        }

        return {
            ...item,
            days,
            units,
            unitPrice,
            rentalTotal,
            customFees,
            totalLineAmount: roundCurrency(rentalTotal + customFees),
        };
    });

    baseRentalSubtotal = roundCurrency(baseRentalSubtotal);
    totalCustomFees = roundCurrency(totalCustomFees);
    const grossSubtotal = roundCurrency(baseRentalSubtotal + totalCustomFees);

    // Calculate Discounts
    const pctDiscount = roundCurrency((grossSubtotal * (Number(discountPercent) || 0)) / 100);
    const totalDiscount = roundCurrency(pctDiscount + (Number(discountFixed) || 0));
    const netSubtotal = Math.max(0, roundCurrency(grossSubtotal - totalDiscount));

    // Calculate Additional Charges
    let additionalChargeCalculated = 0;
    const addAmt = Number(additionalChargeAmount) || 0;
    if (addAmt > 0) {
        switch (additionalChargeType) {
            case "percent":
                additionalChargeCalculated = roundCurrency((netSubtotal * addAmt) / 100);
                break;
            case "per_unit":
                additionalChargeCalculated = roundCurrency(addAmt * totalUnitsCount);
                break;
            case "per_day":
                additionalChargeCalculated = roundCurrency(addAmt * maxDays);
                break;
            case "fixed":
            default:
                additionalChargeCalculated = roundCurrency(addAmt);
                break;
        }
    }

    const logCost = roundCurrency(Number(logisticsCost) || 0);
    const labCost = roundCurrency(Number(laborCost) || 0);

    const grandTotal = Math.max(
        0,
        roundCurrency(netSubtotal + logCost + labCost + additionalChargeCalculated)
    );

    return {
        items: calculatedItems,
        totalUnitsCount,
        totalRentalDays: maxDays,
        baseRentalSubtotal,
        totalCustomFees,
        grossSubtotal,
        discountPercent: Number(discountPercent) || 0,
        discountAmount: totalDiscount,
        netSubtotal,
        logisticsCost: logCost,
        laborCost: labCost,
        additionalChargeName,
        additionalChargeAmount: addAmt,
        additionalChargeType,
        additionalChargeCalculated,
        grandTotal,
        hasUnpricedItems,
    };
}

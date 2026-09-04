/**
 * E3 Asset Depreciation, ROI Ledger & Predictive Equipment Health Engine
 * Straight-line capital asset depreciation, net lifetime ROI, and dynamic health indexing.
 */

export interface AssetFinancialMetrics {
    acquisitionCost: number;
    salvageValue: number;
    usefulLifeYears: number;
    yearsActive: number;
    annualDepreciation: number;
    accumulatedDepreciation: number;
    currentBookValue: number;
    depreciationPercentage: number;
    cumulativeRevenue: number;
    cumulativeMaintenanceCost: number;
    netProfit: number;
    netRoiPercentage: number;
    netLifetimeRoiPercent: number;
    healthScore: number;
    isMaintenanceDue: boolean;
    maintenanceUrgency: "healthy" | "due_soon" | "overdue" | "critical";
    daysSinceLastMaintenance: number;
    daysOverdue: number;
}

export function calculateAssetMetrics(unit: {
    acquisitionCost?: number | null;
    salvageValue?: number | null;
    usefulLifeYears?: number | null;
    purchaseDate?: string | Date | null;
    cumulativeRevenue?: number | null;
    cumulativeMaintenanceCost?: number | null;
    rentalDaysSinceLastMaintenance?: number | null;
    preventiveMaintenanceIntervalDays?: number | null;
    conditionStatus?: string | null;
    availabilityStatus?: string | null;
}): AssetFinancialMetrics {
    const cost = Math.max(0, Number(unit.acquisitionCost) || 0);
    const salvage = Math.max(0, Number(unit.salvageValue) || 0);
    const usefulLife = Math.max(1, Number(unit.usefulLifeYears) || 5);
    const rev = Math.max(0, Number(unit.cumulativeRevenue) || 0);
    const maintCost = Math.max(0, Number(unit.cumulativeMaintenanceCost) || 0);
    const daysSinceMaint = Math.max(0, Number(unit.rentalDaysSinceLastMaintenance) || 0);
    const interval = Math.max(1, Number(unit.preventiveMaintenanceIntervalDays) || 30);
    const condition = (unit.conditionStatus || "good").toLowerCase();

    // 1. Time in Service
    const rawDate = unit.purchaseDate || (unit as any).createdAt;
    const purchaseDate = rawDate ? new Date(rawDate) : new Date(Date.now() - 86400000 * 365); // default 1 yr
    const now = new Date();
    const ageMs = Math.max(0, now.getTime() - purchaseDate.getTime());
    const yearsActive = Number((ageMs / (1000 * 60 * 60 * 24 * 365.25)).toFixed(2));

    // 2. Straight-Line Depreciation
    const depreciableBase = Math.max(0, cost - salvage);
    const annualDepr = Number((depreciableBase / usefulLife).toFixed(2));
    const accumulatedDepr = Number(Math.min(depreciableBase, annualDepr * yearsActive).toFixed(2));
    const currentBookValue = cost > 0 ? Number(Math.max(salvage, cost - accumulatedDepr).toFixed(2)) : 0;
    const depreciationPercentage = cost > 0 ? Number(((accumulatedDepr / cost) * 100).toFixed(1)) : 0;

    // 3. Net Asset ROI %
    const netProfit = Number((rev - maintCost).toFixed(2));
    const netRoiPercentage = cost > 0 ? Number(((netProfit / cost) * 100).toFixed(1)) : 0;

    // 4. Dynamic Health Index (0 - 100)
    let score = 100;

    // Condition deduction
    const conditionPenalties: Record<string, number> = {
        excellent: 0,
        good: 5,
        fair: 20,
        poor: 40,
        maintenance_required: 60,
        retired: 90,
    };
    score -= conditionPenalties[condition] ?? 10;

    // Maintenance interval breach penalty
    const daysOverdue = Math.max(0, daysSinceMaint - interval);
    if (daysOverdue > 0) {
        score -= Math.min(30, daysOverdue * 2);
    }

    // High wear / aging penalty
    if (yearsActive > usefulLife) {
        score -= Math.min(20, Math.floor((yearsActive - usefulLife) * 5));
    }

    // High repair cost ratio penalty (maintenance > 50% of cost)
    if (cost > 0 && maintCost > cost * 0.5) {
        score -= 15;
    }

    const healthScore = Math.max(0, Math.min(100, Math.round(score)));

    // 5. Maintenance Urgency
    let isMaintenanceDue = false;
    let maintenanceUrgency: AssetFinancialMetrics["maintenanceUrgency"] = "healthy";

    if (condition === "maintenance_required" || healthScore < 50 || daysOverdue >= 10) {
        isMaintenanceDue = true;
        maintenanceUrgency = "critical";
    } else if (daysOverdue > 0 || healthScore < 70) {
        isMaintenanceDue = true;
        maintenanceUrgency = "overdue";
    } else if (daysSinceMaint >= interval * 0.8) {
        maintenanceUrgency = "due_soon";
    }

    return {
        acquisitionCost: cost,
        salvageValue: salvage,
        usefulLifeYears: usefulLife,
        yearsActive,
        annualDepreciation: annualDepr,
        accumulatedDepreciation: accumulatedDepr,
        currentBookValue,
        depreciationPercentage,
        cumulativeRevenue: rev,
        cumulativeMaintenanceCost: maintCost,
        netProfit,
        netRoiPercentage,
        netLifetimeRoiPercent: netRoiPercentage,
        healthScore,
        isMaintenanceDue,
        maintenanceUrgency,
        daysSinceLastMaintenance: daysSinceMaint,
        daysOverdue,
    };
}

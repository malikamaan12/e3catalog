import { db } from "./db";
import { 
    categories, products, inventoryUnits, bookings, 
    clientCreditHealth, clientOrganizations, users 
} from "./db/schema";
import { eq, and, or, sql, gte, lte, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// ─── Track 4: 30 / 60 / 90-Day Predictive Shortage Forecaster ───
export async function getPredictiveUtilizationHeatmap() {
    // 1. Get all categories and their total physical unit counts
    const allCategories = await db
        .select({
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
        })
        .from(categories);

    // Count physical inventory units per category
    const unitCounts = await db
        .select({
            categoryId: products.categoryId,
            totalUnits: sql<number>`count(${inventoryUnits.id})`,
        })
        .from(inventoryUnits)
        .innerJoin(products, eq(inventoryUnits.productId, products.id))
        .groupBy(products.categoryId);

    const unitMap = new Map<string, number>();
    for (const row of unitCounts) {
        if (row.categoryId) {
            unitMap.set(row.categoryId, Number(row.totalUnits));
        }
    }

    const now = new Date();
    const horizons = [
        { label: "1-10 Days", startOffset: 0, endOffset: 10 },
        { label: "11-30 Days", startOffset: 10, endOffset: 30 },
        { label: "31-60 Days", startOffset: 30, endOffset: 60 },
        { label: "61-90 Days", startOffset: 60, endOffset: 90 },
    ];

    // Single query to fetch all relevant bookings in next 90 days
    const maxDate = new Date(now.getTime() + 90 * 86400000);
    const activeBookings = await db
        .select({
            categoryId: products.categoryId,
            units: bookings.units,
            startDate: bookings.startDate,
            endDate: bookings.endDate,
        })
        .from(bookings)
        .innerJoin(products, eq(bookings.productId, products.id))
        .where(
            and(
                sql`${bookings.status} NOT IN ('cancelled', 'rejected')`,
                sql`${bookings.startDate} <= ${maxDate}`,
                sql`${bookings.endDate} >= ${now}`
            )
        );

    const categoryResults = [];

    for (const cat of allCategories) {
        const totalCapacity = unitMap.get(cat.id) || 12; // Fallback baseline if empty
        const catBookings = activeBookings.filter(b => b.categoryId === cat.id);

        const horizonMetrics = [];
        for (const h of horizons) {
            const startDate = new Date(now.getTime() + h.startOffset * 86400000);
            const endDate = new Date(now.getTime() + h.endOffset * 86400000);

            // Compute overlapping booked units in memory
            let booked = 0;
            for (const b of catBookings) {
                const bStart = new Date(b.startDate);
                const bEnd = new Date(b.endDate);
                if (bStart <= endDate && bEnd >= startDate) {
                    booked += Number(b.units || 1);
                }
            }

            const utilizationPct = Math.min(100, Math.round((booked / totalCapacity) * 100));

            let riskLevel: "safe" | "moderate" | "high" | "critical_shortage" = "safe";
            if (utilizationPct > 90) riskLevel = "critical_shortage";
            else if (utilizationPct > 75) riskLevel = "high";
            else if (utilizationPct > 60) riskLevel = "moderate";

            horizonMetrics.push({
                horizon: h.label,
                totalUnits: totalCapacity,
                bookedUnits: booked,
                utilizationPct,
                riskLevel,
            });
        }

        categoryResults.push({
            categoryId: cat.id,
            categoryName: cat.name,
            totalFleetUnits: totalCapacity,
            horizons: horizonMetrics,
        });
    }

    return {
        timestamp: now.toISOString(),
        categories: categoryResults,
    };
}

// ─── Executive RevPAR (Revenue Per Available Rental Unit) Engine ───
export async function getExecutiveRevParMetrics() {
    const allCategories = await db
        .select({
            id: categories.id,
            name: categories.name,
        })
        .from(categories);

    // 1. Grouped fleet counts
    const unitStats = await db
        .select({
            categoryId: products.categoryId,
            count: sql<number>`count(*)`,
        })
        .from(inventoryUnits)
        .innerJoin(products, eq(inventoryUnits.productId, products.id))
        .groupBy(products.categoryId);

    const fleetMap = new Map<string, number>();
    for (const r of unitStats) {
        if (r.categoryId) fleetMap.set(r.categoryId, Number(r.count));
    }

    // 2. Grouped revenue from approved/completed bookings
    const revStats = await db
        .select({
            categoryId: products.categoryId,
            revenue: sql<number>`COALESCE(sum(${bookings.totalPrice}), 0)`,
        })
        .from(bookings)
        .innerJoin(products, eq(bookings.productId, products.id))
        .where(sql`${bookings.status} IN ('approved', 'dispatched', 'returned', 'booked')`)
        .groupBy(products.categoryId);

    const revMap = new Map<string, number>();
    for (const r of revStats) {
        if (r.categoryId) revMap.set(r.categoryId, Number(r.revenue));
    }

    const revParList = [];

    for (const cat of allCategories) {
        const fleetCount = Math.max(1, fleetMap.get(cat.id) || 10);
        const totalRevenue = revMap.get(cat.id) || 0;

        // RevPAR = Revenue / (Units * 30 days)
        const monthlyRevPar = Math.round(totalRevenue / (fleetCount * 3));
        const capitalYieldPct = Math.min(100, Math.round((monthlyRevPar / 500) * 100));

        revParList.push({
            categoryId: cat.id,
            categoryName: cat.name,
            fleetUnits: fleetCount,
            totalRevenueQar: totalRevenue,
            revParDailyQar: Math.round(monthlyRevPar / 30),
            revParMonthlyQar: monthlyRevPar,
            capitalYieldPct,
            status: capitalYieldPct > 65 ? "Top Performer" : capitalYieldPct > 40 ? "Steady Yield" : "Underutilized",
        });
    }

    return revParList.sort((a, b) => b.revParMonthlyQar - a.revParMonthlyQar);
}

// ─── Corporate Client Credit Health Scoring Engine ───
export async function auditClientCreditHealth(params: {
    userId?: string;
    organizationId?: string;
    clientName: string;
    creditLimit?: number;
    currentOutstanding?: number;
    averageDaysToPay?: number;
}) {
    const creditLimit = params.creditLimit ?? 75000;
    const currentOutstanding = params.currentOutstanding ?? 12000;
    const avgDays = params.averageDaysToPay ?? 15;

    // Credit Health Score Calculation:
    // Base 100
    // Utilization penalty: >80% = -35, >60% = -20, >40% = -10
    // Payment latency penalty: >45 days = -35, >30 days = -20, >20 days = -10
    let score = 100;
    const utilizationRate = currentOutstanding / creditLimit;
    if (utilizationRate > 0.85) score -= 35;
    else if (utilizationRate > 0.65) score -= 20;
    else if (utilizationRate > 0.40) score -= 10;

    if (avgDays > 45) score -= 35;
    else if (avgDays > 30) score -= 20;
    else if (avgDays > 20) score -= 10;

    score = Math.max(10, Math.min(100, score));

    let riskTier: "low_risk" | "medium_risk" | "high_risk" | "credit_hold" = "low_risk";
    if (score < 45 || utilizationRate >= 1.0) riskTier = "credit_hold";
    else if (score < 65) riskTier = "high_risk";
    else if (score < 80) riskTier = "medium_risk";

    const id = uuidv4();
    await db.insert(clientCreditHealth).values({
        id,
        userId: params.userId || null,
        organizationId: params.organizationId || null,
        clientName: params.clientName,
        creditLimit,
        currentOutstanding,
        paymentBehaviorScore: score,
        riskTier,
        averageDaysToPay: avgDays,
        lastAuditedAt: new Date(),
        updatedAt: new Date(),
    });

    return {
        id,
        clientName: params.clientName,
        creditLimit,
        currentOutstanding,
        paymentBehaviorScore: score,
        riskTier,
        averageDaysToPay: avgDays,
        recommendation: riskTier === "credit_hold" 
            ? "CRITICAL: Automated booking hold. Require 100% upfront settlement."
            : riskTier === "high_risk"
            ? "Require 50% deposit and pre-authorized payment guarantee."
            : "Authorized for standard corporate net-30 invoicing.",
    };
}

export async function listCorporateCreditProfiles() {
    return await db
        .select()
        .from(clientCreditHealth)
        .orderBy(desc(clientCreditHealth.lastAuditedAt))
        .limit(25);
}

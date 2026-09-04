import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pricingSurgeRules, pricingDurationTiers } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { eq, desc, asc } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
    try {
        const surgeRules = await db.query.pricingSurgeRules.findMany({
            orderBy: [desc(pricingSurgeRules.createdAt)],
        });

        const durationTiers = await db.query.pricingDurationTiers.findMany({
            orderBy: [asc(pricingDurationTiers.minDays)],
        });

        return NextResponse.json({
            surgeRules,
            durationTiers,
        });
    } catch (e: any) {
        console.error("GET /api/admin/pricing/rules error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
    ]);
    if (error) return error;

    try {
        const body = await req.json();
        const {
            type, // "surge" | "tier"
            id,
            name,
            code,
            multiplier,
            startDate,
            endDate,
            dayOfWeek,
            minDays,
            maxDays,
            discountPercent,
            isActive = true,
        } = body;

        if (type === "surge") {
            if (!name || !code) {
                return NextResponse.json({ error: "Name and code are required for surge rule" }, { status: 400 });
            }

            if (id) {
                await db.update(pricingSurgeRules)
                    .set({
                        name,
                        code: code.toUpperCase(),
                        multiplier: Number(multiplier) || 1.2,
                        startDate: startDate ? new Date(startDate) : null,
                        endDate: endDate ? new Date(endDate) : null,
                        dayOfWeek: dayOfWeek || null,
                        isActive: Boolean(isActive),
                        updatedAt: new Date(),
                    })
                    .where(eq(pricingSurgeRules.id, id));
            } else {
                await db.insert(pricingSurgeRules).values({
                    id: uuid(),
                    name,
                    code: code.toUpperCase(),
                    multiplier: Number(multiplier) || 1.2,
                    startDate: startDate ? new Date(startDate) : null,
                    endDate: endDate ? new Date(endDate) : null,
                    dayOfWeek: dayOfWeek || null,
                    isActive: Boolean(isActive),
                });
            }

            return NextResponse.json({ success: true, message: "Surge rule saved successfully" });
        } else if (type === "tier") {
            if (!name || minDays === undefined) {
                return NextResponse.json({ error: "Name and minDays are required for duration tier" }, { status: 400 });
            }

            if (id) {
                await db.update(pricingDurationTiers)
                    .set({
                        name,
                        minDays: Number(minDays),
                        maxDays: maxDays !== undefined && maxDays !== null ? Number(maxDays) : null,
                        discountPercent: Number(discountPercent) || 0,
                        isActive: Boolean(isActive),
                        updatedAt: new Date(),
                    })
                    .where(eq(pricingDurationTiers.id, id));
            } else {
                await db.insert(pricingDurationTiers).values({
                    id: uuid(),
                    name,
                    minDays: Number(minDays),
                    maxDays: maxDays !== undefined && maxDays !== null ? Number(maxDays) : null,
                    discountPercent: Number(discountPercent) || 0,
                    isActive: Boolean(isActive),
                });
            }

            return NextResponse.json({ success: true, message: "Duration tier saved successfully" });
        }

        return NextResponse.json({ error: "Invalid type: must be 'surge' or 'tier'" }, { status: 400 });
    } catch (e: any) {
        console.error("POST /api/admin/pricing/rules error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

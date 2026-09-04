import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizationCostCenters, organizationMembers } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.CLIENT,
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
    ]);
    if (error) return error;

    try {
        const url = new URL(req.url);
        let orgId = url.searchParams.get("orgId");

        if (!orgId) {
            const userMembership = await db.query.organizationMembers.findFirst({
                where: eq(organizationMembers.userId, user.id),
            });
            orgId = userMembership?.organizationId || null;
        }

        if (!orgId) {
            return NextResponse.json({ costCenters: [] });
        }

        const costCenters = await db.query.organizationCostCenters.findMany({
            where: eq(organizationCostCenters.organizationId, orgId),
            orderBy: (tbl, { asc }) => [asc(tbl.code)],
        });

        return NextResponse.json({ costCenters });
    } catch (e: any) {
        console.error("GET /api/corporate/cost-centers error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.CLIENT,
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
    ]);
    if (error) return error;

    try {
        const body = await req.json();
        const {
            id: costCenterId,
            orgId: reqOrgId,
            code,
            name,
            budgetAmount = 50000,
            status = "active",
        } = body;

        let orgId = reqOrgId;
        if (!orgId) {
            const callerMembership = await db.query.organizationMembers.findFirst({
                where: eq(organizationMembers.userId, user.id),
            });
            orgId = callerMembership?.organizationId;
        }

        if (!orgId) {
            return NextResponse.json({ error: "Organization context required" }, { status: 400 });
        }

        // Verify caller permissions
        const isPlatformAdmin = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user.role as any);
        if (!isPlatformAdmin) {
            const callerRole = await db.query.organizationMembers.findFirst({
                where: and(
                    eq(organizationMembers.organizationId, orgId),
                    eq(organizationMembers.userId, user.id)
                ),
            });
            if (callerRole?.role !== "org_admin" && callerRole?.role !== "finance") {
                return NextResponse.json({ error: "Forbidden: Org Admin or Finance role required" }, { status: 403 });
            }
        }

        if (!name?.trim() || !code?.trim()) {
            return NextResponse.json({ error: "Cost center code and name are required" }, { status: 400 });
        }

        if (costCenterId) {
            // Update
            await db.update(organizationCostCenters)
                .set({
                    code: code.trim().toUpperCase(),
                    name: name.trim(),
                    budgetAmount: Number(budgetAmount) || 0,
                    status,
                    updatedAt: new Date(),
                })
                .where(eq(organizationCostCenters.id, costCenterId));

            const updated = await db.query.organizationCostCenters.findFirst({
                where: eq(organizationCostCenters.id, costCenterId),
            });
            return NextResponse.json({ success: true, costCenter: updated });
        }

        // Insert
        const newId = uuid();
        await db.insert(organizationCostCenters).values({
            id: newId,
            organizationId: orgId,
            code: code.trim().toUpperCase(),
            name: name.trim(),
            budgetAmount: Number(budgetAmount) || 50000,
            allocatedSpent: 0,
            status: "active",
        });

        const created = await db.query.organizationCostCenters.findFirst({
            where: eq(organizationCostCenters.id, newId),
        });

        return NextResponse.json({ success: true, costCenter: created });
    } catch (e: any) {
        console.error("POST /api/corporate/cost-centers error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

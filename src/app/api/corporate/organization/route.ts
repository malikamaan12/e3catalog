import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientOrganizations, organizationMembers, organizationCostCenters, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { eq } from "drizzle-orm";
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
        const requestedOrgId = url.searchParams.get("orgId");

        let orgId = requestedOrgId;

        // If not specified or user is client, find their membership
        if (!orgId) {
            const membership = await db.query.organizationMembers.findFirst({
                where: eq(organizationMembers.userId, user.id),
                with: { organization: true },
            });
            if (membership?.organization) {
                orgId = membership.organization.id;
            }
        }

        if (!orgId) {
            return NextResponse.json({ organization: null, membership: null });
        }

        const org = await db.query.clientOrganizations.findFirst({
            where: eq(clientOrganizations.id, orgId),
            with: {
                members: {
                    with: { user: true }
                },
                costCenters: true,
                approvalRequests: true,
            }
        });

        const userMembership = org?.members?.find(m => m.userId === user.id);

        return NextResponse.json({
            organization: org,
            membership: userMembership || null,
        });
    } catch (e: any) {
        console.error("GET /api/corporate/organization error:", e);
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
            id: existingOrgId,
            name,
            crNumber,
            taxId,
            billingAddress,
            creditLimit,
            paymentTerms,
            approvalThresholdAmount,
        } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
        }

        if (existingOrgId) {
            // Update existing organization
            await db.update(clientOrganizations)
                .set({
                    name,
                    crNumber,
                    taxId,
                    billingAddress,
                    creditLimit: Number(creditLimit) || 50000,
                    paymentTerms: paymentTerms || "net_30",
                    approvalThresholdAmount: Number(approvalThresholdAmount) || 5000,
                    updatedAt: new Date(),
                })
                .where(eq(clientOrganizations.id, existingOrgId));

            const updated = await db.query.clientOrganizations.findFirst({
                where: eq(clientOrganizations.id, existingOrgId),
                with: { members: true, costCenters: true },
            });

            return NextResponse.json({ organization: updated });
        }

        // Create new organization
        const orgId = uuid();
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") + `-${Date.now().toString().slice(-4)}`;

        await db.insert(clientOrganizations).values({
            id: orgId,
            name,
            slug,
            crNumber: crNumber || null,
            taxId: taxId || null,
            billingAddress: billingAddress || null,
            creditLimit: Number(creditLimit) || 50000,
            creditUsed: 0,
            paymentTerms: paymentTerms || "net_30",
            approvalThresholdAmount: Number(approvalThresholdAmount) || 5000,
            status: "active",
        });

        // Register current user as org_admin & approver
        await db.insert(organizationMembers).values({
            id: uuid(),
            organizationId: orgId,
            userId: user.id,
            role: "org_admin",
            title: "Organization Lead",
            spendLimitPerBooking: 100000,
            canApprove: true,
            status: "active",
        });

        // Seed default cost center
        await db.insert(organizationCostCenters).values({
            id: uuid(),
            organizationId: orgId,
            code: "CC-MAIN",
            name: "General Operations / Unassigned",
            budgetAmount: 100000,
            allocatedSpent: 0,
            status: "active",
        });

        const created = await db.query.clientOrganizations.findFirst({
            where: eq(clientOrganizations.id, orgId),
            with: { members: true, costCenters: true },
        });

        return NextResponse.json({ organization: created });
    } catch (e: any) {
        console.error("POST /api/corporate/organization error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

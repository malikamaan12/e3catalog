import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
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
            return NextResponse.json({ members: [] });
        }

        const members = await db.query.organizationMembers.findMany({
            where: eq(organizationMembers.organizationId, orgId),
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });

        return NextResponse.json({ members });
    } catch (e: any) {
        console.error("GET /api/corporate/members error:", e);
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
            memberId,
            orgId: reqOrgId,
            email,
            role = "member",
            title = "Team Member",
            spendLimitPerBooking = 5000,
            canApprove = false,
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

        // Verify caller has permissions (org_admin, or admin/super_admin)
        const isPlatformAdmin = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user.role as any);
        if (!isPlatformAdmin) {
            const callerRole = await db.query.organizationMembers.findFirst({
                where: and(
                    eq(organizationMembers.organizationId, orgId),
                    eq(organizationMembers.userId, user.id)
                ),
            });
            if (callerRole?.role !== "org_admin") {
                return NextResponse.json({ error: "Forbidden: Org Admin privileges required" }, { status: 403 });
            }
        }

        // Updating existing member
        if (memberId) {
            await db.update(organizationMembers)
                .set({
                    role,
                    title,
                    spendLimitPerBooking: Number(spendLimitPerBooking) || 5000,
                    canApprove: Boolean(canApprove),
                    status,
                    updatedAt: new Date(),
                })
                .where(eq(organizationMembers.id, memberId));

            const updated = await db.query.organizationMembers.findFirst({
                where: eq(organizationMembers.id, memberId),
                with: { user: true },
            });
            return NextResponse.json({ success: true, member: updated });
        }

        // Adding new member by email
        if (!email?.trim()) {
            return NextResponse.json({ error: "Member email is required" }, { status: 400 });
        }

        // Find existing user by email or register placeholder
        let targetUser = await db.query.users.findFirst({
            where: eq(users.email, email.trim().toLowerCase()),
        });

        if (!targetUser) {
            // Create user account with client role
            const newUserId = uuid();
            await db.insert(users).values({
                id: newUserId,
                email: email.trim().toLowerCase(),
                name: email.split("@")[0].replace(/[._-]/g, " "),
                role: USER_ROLES.CLIENT,
                password: "TEMPORARY_INVITED_USER_HASH",
            });
            targetUser = await db.query.users.findFirst({
                where: eq(users.id, newUserId),
            });
        }

        if (!targetUser) {
            return NextResponse.json({ error: "Failed to resolve target user." }, { status: 500 });
        }

        // Check if already in org
        const existingMember = await db.query.organizationMembers.findFirst({
            where: and(
                eq(organizationMembers.organizationId, orgId),
                eq(organizationMembers.userId, targetUser.id)
            ),
        });

        if (existingMember) {
            return NextResponse.json({ error: "User is already a member of this organization." }, { status: 400 });
        }

        const newMemberId = uuid();
        await db.insert(organizationMembers).values({
            id: newMemberId,
            organizationId: orgId,
            userId: targetUser.id,
            role,
            title,
            spendLimitPerBooking: Number(spendLimitPerBooking) || 5000,
            canApprove: Boolean(canApprove),
            status: "active",
        });

        const created = await db.query.organizationMembers.findFirst({
            where: eq(organizationMembers.id, newMemberId),
            with: { user: true },
        });

        return NextResponse.json({ success: true, member: created });
    } catch (e: any) {
        console.error("POST /api/corporate/members error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

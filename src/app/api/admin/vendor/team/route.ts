import { db } from "@/lib/db";
import { users, vendorTeamMembers, systemLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";
import { USER_ROLES, VENDOR_ROLE } from "@/lib/constants";

export async function GET() {
    try {
        const { user, error } = await requireAdmin([USER_ROLES.VENDOR, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
        if (error) return error;

        const targetVendorId = (user as any).vendorId;

        if (!targetVendorId) {
            return NextResponse.json({ error: "User is not associated with a vendor tenant." }, { status: 403 });
        }

        const teamUsers = await db.query.users.findMany({
            where: eq(users.vendorId, targetVendorId),
            columns: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                role: true,
                status: true,
                createdAt: true,
                lastActive: true,
            },
            orderBy: (users, { desc }) => [desc(users.createdAt)],
        });

        const invites = await db.query.vendorTeamMembers.findMany({
            where: eq(vendorTeamMembers.vendorId, targetVendorId),
            orderBy: (invites, { desc }) => [desc(invites.createdAt)],
        });

        return NextResponse.json({
            members: teamUsers,
            invitations: invites,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { user, error } = await requireAdmin([USER_ROLES.VENDOR, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
        if (error) return error;

        const targetVendorId = (user as any).vendorId;

        if (!targetVendorId) {
            return NextResponse.json({ error: "User is not associated with a vendor tenant." }, { status: 403 });
        }

        const body = await req.json();
        const { name, email, password, role = "catalog_manager", phoneNumber } = body;

        if (!name || !email || !password) {
            return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check for existing email across platform
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, normalizedEmail),
        });

        if (existingUser) {
            return NextResponse.json({ error: "An account with this email address already exists." }, { status: 409 });
        }

        const hashedPassword = await hash(password, 10);
        const newUserId = uuid();
        const inviteId = uuid();
        const now = new Date();

        await db.transaction(async (tx) => {
            await tx.insert(users).values({
                id: newUserId,
                name,
                email: normalizedEmail,
                password: hashedPassword,
                phoneNumber: phoneNumber || null,
                role: USER_ROLES.VENDOR, // Platform level role
                vendorId: targetVendorId,
                status: "active",
                createdAt: now,
                updatedAt: now,
            });

            await tx.insert(vendorTeamMembers).values({
                id: inviteId,
                vendorId: targetVendorId,
                userId: newUserId,
                invitedEmail: normalizedEmail,
                role: role as any,
                status: "active",
                acceptedAt: now,
                createdAt: now,
                updatedAt: now,
            });

            await tx.insert(systemLogs).values({
                id: uuid(),
                adminId: user.id,
                action: "VENDOR_TEAM:MEMBER_ADDED",
                targetId: newUserId,
                targetType: "user",
                details: JSON.stringify({
                    vendorId: targetVendorId,
                    email: normalizedEmail,
                    role,
                }),
                createdAt: now,
            });
        });

        return NextResponse.json({ 
            success: true, 
            message: `Team member ${name} added successfully.` 
        }, { status: 201 });

    } catch (e: any) {
        console.error("Failed to add vendor team member:", e);
        return NextResponse.json({ error: e.message || "Failed to add team member" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { user, error } = await requireAdmin([USER_ROLES.VENDOR, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
        if (error) return error;

        const targetVendorId = (user as any).vendorId;
        if (!targetVendorId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json();
        const { userId, role, status } = body;

        if (!userId) {
            return NextResponse.json({ error: "userId is required." }, { status: 400 });
        }

        // Verify user belongs to this vendor tenant
        const targetMember = await db.query.users.findFirst({
            where: and(
                eq(users.id, userId),
                eq(users.vendorId, targetVendorId)
            ),
        });

        if (!targetMember) {
            return NextResponse.json({ error: "Team member not found in your organization." }, { status: 404 });
        }

        // Protect last owner
        if (targetMember.id === user.id && status === "disabled") {
            return NextResponse.json({ error: "You cannot disable your own active account." }, { status: 400 });
        }

        const now = new Date();
        const updates: any = { updatedAt: now };
        if (status) updates.status = status;

        await db.transaction(async (tx) => {
            await tx.update(users)
                .set(updates)
                .where(eq(users.id, userId));

            if (role) {
                await tx.update(vendorTeamMembers)
                    .set({ role, updatedAt: now })
                    .where(and(
                        eq(vendorTeamMembers.vendorId, targetVendorId),
                        eq(vendorTeamMembers.userId, userId)
                    ));
            }
        });

        return NextResponse.json({ success: true, message: "Team member updated successfully." });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Update failed" }, { status: 500 });
    }
}

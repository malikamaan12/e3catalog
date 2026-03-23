import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { v4 as uuidv4 } from "uuid";
import { USER_ROLES } from "@/lib/constants";

export async function GET() {
    try {
        const { user, error } = await requireAdmin([USER_ROLES.VENDOR]);
        if (error) return error;

        const targetVendorId = (user as any).vendorId;

        if (!targetVendorId) {
            return NextResponse.json({ error: "User is not associated with a vendor." }, { status: 403 });
        }

        const teamMembers = await db.query.users.findMany({
            where: and(
                eq(users.vendorId, targetVendorId),
                // Exclude the vendor root account from the team list itself
                // (assuming the root vendor has the role 'vendor' and sub-accounts have other roles)
                // Actually, let's just return all users under this vendorId for clarity, 
                // but the front-end can highlight the owner.
            ),
            columns: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                role: true,
                status: true,
                createdAt: true,
                lastLoginIp: true,
                lastActive: true,
            },
            orderBy: (users, { desc }) => [desc(users.createdAt)]
        });

        return NextResponse.json(teamMembers);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { user, error } = await requireAdmin([USER_ROLES.VENDOR]);
        if (error) return error;

        const targetVendorId = (user as any).vendorId;

        if (!targetVendorId) {
            return NextResponse.json({ error: "User is not associated with a vendor." }, { status: 403 });
        }

        const body = await req.json();
        const { name, email, password, role, phoneNumber } = body;

        if (!name || !email || !password || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (![USER_ROLES.SALES_REP, USER_ROLES.WAREHOUSE_MANAGER].includes(role as any)) {
            return NextResponse.json({ error: "Invalid role. Only Sales Rep or Warehouse Manager are allowed." }, { status: 400 });
        }

        // Check for existing email across the platform
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email.toLowerCase())
        });

        if (existingUser) {
            return NextResponse.json({ error: "Email is already in use by another account." }, { status: 400 });
        }

        const newUserId = uuidv4();
        await db.insert(users).values({
            id: newUserId,
            name,
            email: email.toLowerCase(),
            password, // Store as plaintext per current platform behavior (no bcrypt installed)
            phoneNumber: phoneNumber || null,
            role,
            vendorId: targetVendorId,
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const createdUser = await db.query.users.findFirst({
            where: eq(users.id, newUserId),
            columns: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
            }
        });

        return NextResponse.json(createdUser, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { user, error } = await requireAdmin([USER_ROLES.VENDOR]);
        if (error) return error;

        const targetVendorId = (user as any).vendorId;

        if (!targetVendorId) {
            return NextResponse.json({ error: "User is not associated with a vendor." }, { status: 403 });
        }

        const body = await req.json();
        const { userId, status } = body;

        if (!userId || !status) {
            return NextResponse.json({ error: "User ID and Status are required" }, { status: 400 });
        }

        // Ensure the vendor isn't trying to modify the root owner's status or another vendor's user
        const targetUser = await db.query.users.findFirst({
            where: and(eq(users.id, userId), eq(users.vendorId, targetVendorId))
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found or you do not have permission to modify them." }, { status: 404 });
        }

        if (targetUser.role === USER_ROLES.VENDOR) {
            return NextResponse.json({ error: "You cannot modify the root vendor account status from here." }, { status: 403 });
        }

        if (!["active", "frozen", "blocked"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        await db.update(users).set({
            status,
            updatedAt: new Date()
        }).where(eq(users.id, userId));

        return NextResponse.json({ success: true, id: userId, status });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

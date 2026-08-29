import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, sql, ilike, or } from "drizzle-orm";
import { hasPermission, canAssignRole } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";
import { v4 as uuid } from "uuid";

export async function GET(req: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!hasPermission(user.role, "manage_users")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const url = new URL(req.url);
        const role = url.searchParams.get("role");
        const status = url.searchParams.get("status");
        const query = url.searchParams.get("q");

        let conditions: any[] = [];
        if (role) conditions.push(eq(users.role, role));
        if (status) conditions.push(eq(users.status, status));
        if (query) {
            conditions.push(or(
                ilike(users.name, `%${query}%`),
                ilike(users.email, `%${query}%`)
            ));
        }

        const userList = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            phoneNumber: users.phoneNumber,
            role: users.role,
            status: users.status,
            companyName: users.companyName,
            vendorId: users.vendorId,
            lastActive: users.lastActive,
            createdAt: users.createdAt,
        }).from(users).where(conditions.length > 0 ? and(...conditions) : undefined).limit(100);

        return NextResponse.json({ users: userList });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!hasPermission(user.role, "manage_users")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { email, name, role, password, companyName, phoneNumber } = body;

        if (!email || !name || !role) {
            return NextResponse.json({ error: "Email, name, and role are required" }, { status: 400 });
        }

        if (!canAssignRole(user.role, role)) {
            return NextResponse.json({ error: "Forbidden: Cannot assign privileged role without sufficient authority" }, { status: 403 });
        }

        const newUserId = uuid();
        await db.insert(users).values({
            id: newUserId,
            name,
            email: email.toLowerCase().trim(),
            role,
            password: password || "temp-password-12345",
            companyName,
            phoneNumber,
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await logAuditEvent({
            actorId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            action: "user.created",
            objectType: "user",
            objectId: newUserId,
            afterState: { id: newUserId, email, name, role },
            severity: "info",
        });

        return NextResponse.json({ success: true, userId: newUserId });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}

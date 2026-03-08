import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { eq } from "drizzle-orm";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { error } = await requireSuperAdmin();
    if (error) return error;

    try {
        const { id } = await params;
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (err) {
        console.error("Error fetching user:", err);
        return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { error, user: currentSuperAdmin } = await requireSuperAdmin();
    if (error) return error;

    try {
        const { id } = await params;
        const body = await req.json();
        const { role, name, email, phoneNumber, status, passwordReset } = body;

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (role) updateData.role = role;
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (phoneNumber) updateData.phoneNumber = phoneNumber;
        if (status) updateData.status = status;

        // Handle direct password reset (in a real system, this would be hashed)
        if (passwordReset) {
            updateData.password = passwordReset;
        }

        const [updated] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, id))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // --- Audit Logging ---
        try {
            const { v4: uuidv4 } = await import('uuid');
            db.insert(require("@/lib/db/schema").systemLogs).values({
                id: uuidv4(),
                adminId: currentSuperAdmin?.id || 'system',
                action: passwordReset ? 'reset_password' : 'update_user',
                targetId: id,
                targetType: 'user',
                details: JSON.stringify(updateData),
                createdAt: new Date()
            }).execute();
        } catch (logErr) {
            console.error("Failed to log system action:", logErr);
        }

        return NextResponse.json(updated);
    } catch (err) {
        console.error("Error updating user:", err);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { error, user: currentSuperAdmin } = await requireSuperAdmin();
    if (error) return error;

    const { id } = await params;

    // Prevent self-deletion
    if (currentSuperAdmin && id === currentSuperAdmin.id) {
        return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    try {
        const [deleted] = await db
            .delete(users)
            .where(eq(users.id, id))
            .returning();

        if (!deleted) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "User deleted successfully" });
    } catch (err) {
        console.error("Error deleting user:", err);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}

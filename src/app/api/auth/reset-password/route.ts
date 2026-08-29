import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyAndConsumeAuthToken } from "@/lib/auth-tokens";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const token = body.token ? String(body.token).trim() : "";
        const newPassword = body.newPassword ? String(body.newPassword) : "";

        if (!token) {
            return NextResponse.json({ error: "Reset token is required" }, { status: 400 });
        }

        if (!newPassword || newPassword.length < 8) {
            return NextResponse.json({ error: "New password must be at least 8 characters long" }, { status: 400 });
        }

        const verification = await verifyAndConsumeAuthToken(token, "password_reset");
        if (!verification.valid || !verification.userId) {
            return NextResponse.json({ error: verification.error || "Invalid or expired token" }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in DB
        await db
            .update(users)
            .set({
                password: hashedPassword,
                updatedAt: new Date(),
            })
            .where(eq(users.id, verification.userId));

        // Revoke all existing sessions for this user across all devices
        await db
            .update(userSessions)
            .set({
                isRevoked: true,
                revokedAt: new Date(),
            })
            .where(eq(userSessions.userId, verification.userId));

        return NextResponse.json({
            success: true,
            message: "Your password has been successfully reset. Please log in with your new credentials.",
        });
    } catch (err: any) {
        console.error("[Auth] Reset password error:", err.message);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

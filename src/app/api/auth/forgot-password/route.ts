import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAuthToken } from "@/lib/auth-tokens";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const email = body.email ? String(body.email).trim().toLowerCase() : "";

        if (!email || !email.includes("@")) {
            return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
        }

        // Find user by email
        const [user] = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                status: users.status,
            })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        // Uniform success response to prevent account enumeration
        if (user && user.status === "active") {
            const { rawToken } = await createAuthToken(user.id, "password_reset", 3600);
            await sendPasswordResetEmail(user.email, rawToken, user.name);
        }

        return NextResponse.json({
            success: true,
            message: "If an account exists with this email, password reset instructions have been sent.",
        });
    } catch (err: any) {
        console.error("[Auth] Forgot password error:", err.message);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

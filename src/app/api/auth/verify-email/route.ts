import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyAndConsumeAuthToken } from "@/lib/auth-tokens";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const token = body.token ? String(body.token).trim() : "";

        if (!token) {
            return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
        }

        const verification = await verifyAndConsumeAuthToken(token, "email_verification");
        if (!verification.valid || !verification.userId) {
            return NextResponse.json({ error: verification.error || "Invalid or expired verification token" }, { status: 400 });
        }

        await db
            .update(users)
            .set({
                updatedAt: new Date(),
            })
            .where(eq(users.id, verification.userId));

        return NextResponse.json({
            success: true,
            message: "Your email address has been successfully verified.",
        });
    } catch (err: any) {
        console.error("[Auth] Verify email error:", err.message);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
        return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
    }

    const verification = await verifyAndConsumeAuthToken(token, "email_verification");
    if (!verification.valid || !verification.userId) {
        return NextResponse.json({ error: verification.error || "Invalid or expired verification token" }, { status: 400 });
    }

    return NextResponse.json({
        success: true,
        message: "Your email address has been successfully verified.",
    });
}

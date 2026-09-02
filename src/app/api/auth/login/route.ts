import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userSessions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { signToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { checkRateLimit, applyRateLimitHeaders, getClientIp } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import * as crypto from "crypto";

export async function POST(req: NextRequest) {
    const ip = getClientIp(req);
    
    // Distributed Rate Limiting (30 attempts per minute per IP)
    const rateLimit = await checkRateLimit(`login:${ip}`, { limit: 30, windowSeconds: 60 });
    if (!rateLimit.success) {
        const res = NextResponse.json(
            { error: `Too many login attempts. Please retry in ${rateLimit.retryAfter} seconds.` },
            { status: 429 }
        );
        return applyRateLimitHeaders(res, rateLimit);
    }

    try {
        const body = await req.json().catch(() => ({}));
        const email = body.email ? String(body.email).toLowerCase().trim() : "";
        const password = body.password ? String(body.password) : "";

        if (!email || !password) {
            const res = NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
            return applyRateLimitHeaders(res, rateLimit);
        }

        const [user] = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                role: users.role,
                status: users.status,
                password: users.password,
            })
            .from(users)
            .where(sql`lower(${users.email}) = ${email}`)
            .limit(1);

        if (!user) {
            const res = NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            );
            return applyRateLimitHeaders(res, rateLimit);
        }

        if (!user.password) {
            const res = NextResponse.json(
                { error: "No password set for this account. Please use 'Forgot password' to set a password." },
                { status: 401 }
            );
            return applyRateLimitHeaders(res, rateLimit);
        }

        // Validate password against hashed or plain format
        let isValid = false;
        const isBcrypt = user.password.startsWith("$2");
        if (isBcrypt) {
            isValid = await bcrypt.compare(password, user.password);
        } else {
            isValid = user.password === password;
            // Transparently upgrade plaintext password to bcrypt hash in DB
            if (isValid) {
                try {
                    const hashed = await bcrypt.hash(password, 10);
                    await db.update(users).set({ password: hashed, updatedAt: new Date() }).where(eq(users.id, user.id));
                } catch {
                    // Non-critical background upgrade
                }
            }
        }

        if (!isValid) {
            const res = NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            );
            return applyRateLimitHeaders(res, rateLimit);
        }

        if (user.status === "blocked" || user.status === "suspended" || user.status === "inactive") {
            const res = NextResponse.json(
                { error: "Your account is not active. Please contact support." },
                { status: 403 }
            );
            return applyRateLimitHeaders(res, rateLimit);
        }

        const token = await signToken({
            id: user.id,
            email: user.email,
            role: user.role,
        });

        // Record active session
        const sessionTokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        try {
            await db.insert(userSessions).values({
                id: uuid(),
                userId: user.id,
                sessionTokenHash,
                ipAddress: ip,
                deviceInfo: req.headers.get("user-agent")?.substring(0, 480) || "Unknown",
                isRevoked: false,
                lastActiveAt: new Date(),
                createdAt: new Date(),
                expiresAt,
            });
        } catch {
            // Non-critical session record error
        }

        const cookieStore = await cookies();
        cookieStore.set("e3_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: "/",
        });

        const res = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

        return applyRateLimitHeaders(res, rateLimit);
    } catch (error: any) {
        console.error("Login endpoint error detail:", error.message);
        const res = NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
        return applyRateLimitHeaders(res, rateLimit);
    }
}

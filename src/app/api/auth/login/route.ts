import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { signToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        // Fallback to phone number for users auto-registered before password field was added
        const [user] = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                role: users.role,
                status: users.status,
                password: users.password,
                phoneNumber: users.phoneNumber,
            })
            .from(users)
            .where(
                and(
                    eq(users.email, email.toLowerCase()),
                    or(
                        eq(users.password, password),
                        eq(users.phoneNumber, password)
                    )
                )
            )
            .limit(1);

        if (!user) {
            return NextResponse.json(
                { error: "Invalid credentials. If you requested a quote, your password is the phone number you provided." },
                { status: 401 }
            );
        }

        if (user.status === 'blocked') {
            return NextResponse.json(
                { error: "Your account has been blocked by the administrator." },
                { status: 403 }
            );
        }

        if (user.status === 'frozen') {
            return NextResponse.json(
                { error: "Your account is temporarily frozen. Please contact support." },
                { status: 403 }
            );
        }

        const token = await signToken({
            id: user.id,
            email: user.email,
            role: user.role,
        });

        const cookieStore = await cookies();
        cookieStore.set("e3_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: "/",
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error: any) {
        console.error("Login endpoint error detail:", {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        return NextResponse.json(
            {
                error: "Internal server error: " + (error.message || "Unknown error"),
                version: "2026-03-09-v2-login"
            },
            { status: 500 }
        );
    }
}

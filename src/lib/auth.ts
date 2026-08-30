import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cache } from "react";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import { env } from "./env";

function getSecretKey(): Uint8Array {
    return new TextEncoder().encode(env.AUTHENTICATION_SECRET || env.JWT_SECRET);
}

export async function signToken(payload: { id: string; email: string; role: string }) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(getSecretKey());
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, getSecretKey());
        return payload as { id: string; email: string; role: string };
    } catch (error) {
        return null;
    }
}

export const getSession = cache(async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("e3_session")?.value;
    if (!token) return null;

    return await verifyToken(token);
});

export const getCurrentUser = cache(async function getCurrentUser() {
    const session = await getSession();
    if (!session) return null;

    try {
        const [user] = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                status: users.status,
                image: users.image,
                vendorId: users.vendorId,
                phoneNumber: users.phoneNumber,
                companyName: users.companyName,
            })
            .from(users)
            .where(eq(users.id, session.id))
            .limit(1);

        if (!user || user.status === "suspended" || user.status === "inactive") {
            return null;
        }

        return user;
    } catch (dbErr) {
        console.error("[DB] getCurrentUser failed — returning null:", (dbErr as Error).message);
        return null;
    }
});

export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return { user, error: null };
}

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || process.env.AUTHENTICATION_SECRET || "default_super_secret_key_for_development"
);

export async function signToken(payload: { id: string; email: string; role: string }) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(SECRET_KEY);
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        return payload as { id: string; email: string; role: string };
    } catch (error) {
        return null;
    }
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("e3_session")?.value;
    if (!token) return null;

    return await verifyToken(token);
}

export async function getCurrentUser() {
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

        return user || null;
    } catch (dbErr) {
        console.error("[DB] getCurrentUser failed — returning null:", (dbErr as Error).message);
        return null;
    }
}

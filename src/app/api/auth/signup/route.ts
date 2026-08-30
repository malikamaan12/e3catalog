import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, name, phoneNumber } = body;

        if (!email || !password || !name) {
            return NextResponse.json(
                { error: "Name, email, and password are required" },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters long" },
                { status: 400 }
            );
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if user exists
        const existingUsers = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);

        if (existingUsers.length > 0) {
            return NextResponse.json(
                { error: "Email is already registered" },
                { status: 409 }
            );
        }

        const targetUserId = uuid();
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.insert(users).values({
            id: targetUserId,
            name: name.trim(),
            email: normalizedEmail,
            phoneNumber: phoneNumber || "",
            password: hashedPassword,
            role: "client",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return NextResponse.json({ success: true, message: "Account created successfully" });

    } catch (error: any) {
        console.error("Signup endpoint error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

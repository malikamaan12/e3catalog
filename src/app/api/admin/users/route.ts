import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
    const { error } = await requireSuperAdmin();
    if (error) return error;

    try {
        const allUsers = await db
            .select()
            .from(users)
            .orderBy(desc(users.createdAt));

        return NextResponse.json(allUsers);
    } catch (err) {
        console.error("Error fetching users:", err);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const { error } = await requireSuperAdmin();
    if (error) return error;

    try {
        const body = await req.json();
        const { name, email, role, phoneNumber } = body;

        if (!name || !email || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newUser = {
            id: uuidv4(),
            name,
            email,
            role,
            phoneNumber,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const [created] = await db.insert(users).values(newUser).returning();

        return NextResponse.json(created);
    } catch (err) {
        console.error("Error creating user:", err);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}

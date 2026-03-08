import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET() {
    try {
        // Check if any admin exists
        const existingAdmins = await db.query.users.findMany({
            where: eq(users.role, "admin"),
            limit: 1,
        });

        if (existingAdmins.length > 0) {
            return NextResponse.json(
                { error: "Admin account already exists. Initialization disabled." },
                { status: 403 }
            );
        }

        // Create the first admin
        const targetUserId = uuid();
        await db.insert(users).values({
            id: targetUserId,
            name: "Admin",
            email: "admin@e3rentals.com",
            phoneNumber: "",
            password: "adminpassword123", // They should change this
            role: "admin",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: "Primary admin account created successfully.",
            email: "admin@e3rentals.com",
            password: "adminpassword123"
        });

    } catch (error: any) {
        console.error("Admin init error detail:", {
            message: error.message,
            stack: error.stack,
            code: error.code,
            detail: error.detail,
            hint: error.hint
        });
        return NextResponse.json(
            { error: `Internal server error: ${error.message}${error.detail ? ' | ' + error.detail : ''}${error.hint ? ' | ' + error.hint : ''}` },
            { status: 500 }
        );
    }
}

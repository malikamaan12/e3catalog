import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminSettings } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
    try {
        const types = ['term_condition', 'payment_term', 'payment_method'];
        const settings = await db.select().from(adminSettings).where(inArray(adminSettings.type, types));

        return NextResponse.json(settings);
    } catch (error) {
        console.error("Error fetching billing settings:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const body = await req.json();
        const { type, label, content, isDefault, isActive } = body;

        if (!type || !label || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newSetting = {
            id: uuidv4(),
            type,
            label,
            content,
            isDefault: isDefault ?? false,
            isActive: isActive ?? true,
            createdAt: new Date()
        };

        await db.insert(adminSettings).values(newSetting);

        return NextResponse.json(newSetting, { status: 201 });
    } catch (error) {
        console.error("Error creating setting:", error);
        return NextResponse.json({ error: "Failed to create setting" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventCrewRoles } from "@/lib/db/schema";
import { ensureDefaultCrewRoles } from "@/lib/crew-scheduling";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
    try {
        await ensureDefaultCrewRoles();
        const roles = await db.select().from(eventCrewRoles).orderBy(eventCrewRoles.name);
        return NextResponse.json({ roles });
    } catch (err: any) {
        console.error("Crew roles GET error:", err);
        return NextResponse.json({ error: err.message || "Failed to load crew roles" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, code, defaultHourlyRate = 150, overtimeMultiplier = 1.5, description } = body;

        const id = uuidv4();
        await db.insert(eventCrewRoles).values({
            id,
            name,
            code: code.toUpperCase().replace(/\s+/g, "_"),
            defaultHourlyRate,
            overtimeMultiplier,
            description,
            isActive: true,
            createdAt: new Date(),
        });

        return NextResponse.json({ success: true, role: { id, name, code, defaultHourlyRate } }, { status: 201 });
    } catch (err: any) {
        console.error("Crew roles POST error:", err);
        return NextResponse.json({ error: err.message || "Failed to create crew role" }, { status: 500 });
    }
}

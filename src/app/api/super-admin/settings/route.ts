import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { logAuditAction } from "@/lib/auditLogger";

export async function GET() {
    const { error } = await requireSuperAdmin();
    if (error) return error;

    try {
        const allSettings = await db
            .select()
            .from(siteSettings);

        return NextResponse.json(allSettings);
    } catch (err) {
        console.error("Error fetching settings:", err);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const { error, user: currentAdmin } = await requireSuperAdmin();
    if (error) return error;

    try {
        const body = await req.json();
        const { key, value, group, description } = body;

        if (!key || value === undefined) {
            return NextResponse.json({ error: "Key and Value are required" }, { status: 400 });
        }

        // Check if key already exists
        const [existing] = await db
            .select()
            .from(siteSettings)
            .where(eq(siteSettings.key, key))
            .limit(1);

        if (existing) {
            // Update instead of insert
            const [updated] = await db
                .update(siteSettings)
                .set({
                    value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                    group: group || existing.group,
                    description: description || existing.description,
                    updatedAt: new Date(),
                })
                .where(eq(siteSettings.key, key))
                .returning();
            
            // Log the update
            await logAuditAction({
                adminId: currentAdmin?.id || 'system',
                action: 'update_setting',
                targetId: key,
                targetType: 'setting',
                details: { value, group: group || existing.group }
            });

            return NextResponse.json(updated);
        }

        const newSetting = {
            id: uuidv4(),
            key,
            value: typeof value === 'object' ? JSON.stringify(value) : String(value),
            group: group || "general",
            description,
            updatedAt: new Date(),
        };

        const [created] = await db.insert(siteSettings).values(newSetting).returning();

        // Log the creation
        await logAuditAction({
            adminId: currentAdmin?.id || 'system',
            action: 'create_setting',
            targetId: key,
            targetType: 'setting',
            details: { value, group: group || "general" }
        });

        return NextResponse.json(created);
    } catch (err) {
        console.error("Error saving setting:", err);
        return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const { error, user: currentAdmin } = await requireSuperAdmin();
    if (error) return error;

    try {
        const body = await req.json();
        const { id, value, group, description } = body;

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        const [updated] = await db
            .update(siteSettings)
            .set({
                value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                group,
                description,
                updatedAt: new Date(),
            })
            .where(eq(siteSettings.id, id))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Setting not found" }, { status: 404 });
        }

        // Log the update
        await logAuditAction({
            adminId: currentAdmin?.id || 'system',
            action: 'update_setting',
            targetId: updated.key,
            targetType: 'setting',
            details: { value, group, description }
        });

        return NextResponse.json(updated);
    } catch (err) {
        console.error("Error updating setting:", err);
        return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
    }
}

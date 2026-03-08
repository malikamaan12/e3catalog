import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id } = await params;
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const body = await req.json();
        const { label, content, isDefault, isActive } = body;

        const updateData: any = {};
        if (label !== undefined) updateData.label = label;
        if (content !== undefined) updateData.content = content;
        if (isDefault !== undefined) updateData.isDefault = isDefault;
        if (isActive !== undefined) updateData.isActive = isActive;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const result = await db.update(adminSettings)
            .set(updateData)
            .where(eq(adminSettings.id, id))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ error: "Setting not found" }, { status: 404 });
        }

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error("Error updating setting:", error);
        return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        await db.delete(adminSettings).where(eq(adminSettings.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting setting:", error);
        return NextResponse.json({ error: "Failed to delete setting" }, { status: 500 });
    }
}

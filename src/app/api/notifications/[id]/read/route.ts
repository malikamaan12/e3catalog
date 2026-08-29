import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const [target] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
        if (!target) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

        // Enforce ownership
        if (target.userId !== user.id) {
            return NextResponse.json({ error: "Forbidden: Cannot mutate another user's notifications" }, { status: 403 });
        }

        await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

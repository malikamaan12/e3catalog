import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Ensure the notification actually belongs to this user before marking read
        const notification = await db.query.notifications.findFirst({
            where: and(eq(notifications.id, id), eq(notifications.userId, user.id)),
        });

        if (!notification) {
            return NextResponse.json({ error: "Not Found" }, { status: 404 });
        }

        await db.update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Notification Read Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userNotifications = await db.query.notifications.findMany({
            where: eq(notifications.userId, user.id),
            orderBy: [desc(notifications.createdAt)],
            limit: 50,
        });

        return NextResponse.json(userNotifications);
    } catch (error) {
        console.error("Notifications GET Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

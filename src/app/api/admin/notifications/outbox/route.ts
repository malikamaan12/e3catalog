import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notificationOutbox } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!hasPermission(user.role, "global_search")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const items = await db.select().from(notificationOutbox)
            .orderBy(desc(notificationOutbox.createdAt))
            .limit(100);

        return NextResponse.json({ outbox: items });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

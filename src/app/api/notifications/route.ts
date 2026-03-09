import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
    const authCheck = await requireAdmin(["super_admin", "admin", "sales_rep", "vendor", "warehouse_manager"]);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    try {
        const items = await db.query.notifications.findMany({
            where: eq(notifications.userId, user.id),
            orderBy: [desc(notifications.createdAt)],
            limit,
        });

        const unreadCount = items.filter(n => !n.isRead).length;

        return NextResponse.json({ notifications: items, unreadCount });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

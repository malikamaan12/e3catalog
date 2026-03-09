import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";

export async function POST() {
    const authCheck = await requireAdmin(["super_admin", "admin", "sales_rep", "vendor", "warehouse_manager"]);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    try {
        await db
            .update(notifications)
            .set({ isRead: true })
            .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

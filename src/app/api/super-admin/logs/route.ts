import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { systemLogs, users } from "@/lib/db/schema";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { eq, desc } from "drizzle-orm";

export async function GET() {
    const { error } = await requireSuperAdmin();
    if (error) return error;

    try {
        const logs = await db
            .select({
                id: systemLogs.id,
                action: systemLogs.action,
                targetId: systemLogs.targetId,
                targetType: systemLogs.targetType,
                details: systemLogs.details,
                createdAt: systemLogs.createdAt,
                adminName: users.name,
                adminEmail: users.email
            })
            .from(systemLogs)
            .innerJoin(users, eq(systemLogs.adminId, users.id))
            .orderBy(desc(systemLogs.createdAt))
            .limit(100);

        return NextResponse.json(logs);
    } catch (err) {
        console.error("Error fetching system logs:", err);
        return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { processNotificationOutbox } from "@/lib/notifications";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    const cronSecret = env.CRON_SECRET || "dev_cron_secret_token";

    if (authHeader !== `Bearer ${cronSecret}` && req.headers.get("x-cron-secret") !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
    }

    try {
        const result = await processNotificationOutbox(50);
        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...result,
        });
    } catch (err: any) {
        console.error("[Cron] process-notifications error:", err.message);
        return NextResponse.json({ error: "Failed to process notifications" }, { status: 500 });
    }
}

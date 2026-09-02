import { NextRequest, NextResponse } from "next/server";
import { processNotificationOutbox } from "@/lib/notifications";
import { verifyCronAuthorization, unauthorizedCronResponse, methodNotAllowedResponse } from "@/lib/cron-auth";
import { withCronExecutionGovernance } from "@/lib/cron-governance";

export const dynamic = "force-dynamic";

export async function GET() {
    return methodNotAllowedResponse();
}

export async function POST(req: NextRequest) {
    if (!verifyCronAuthorization(req)) {
        return unauthorizedCronResponse();
    }

    const execution = await withCronExecutionGovernance(
        "process_notifications",
        "scheduled",
        undefined,
        async () => {
            const result = await processNotificationOutbox(50);
            return {
                jobName: "process_notifications",
                itemsProcessed: (result as any)?.processedCount || 0,
                itemsFailed: (result as any)?.failedCount || 0,
                details: result,
            };
        }
    );

    if (!execution.success) {
        return NextResponse.json({ error: execution.message }, { status: 429 });
    }

    return NextResponse.json({
        success: true,
        runId: execution.runId,
        result: execution.result,
    });
}

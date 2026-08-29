import { NextResponse } from "next/server";
import { verifyCronSecret, withCronExecutionGovernance } from "@/lib/cron-governance";
import { db } from "@/lib/db";
import { safetyCertificates, vendorDocuments, vendors } from "@/lib/db/schema";
import { eq, and, lt } from "drizzle-orm";

export async function POST(req: Request) {
    if (!verifyCronSecret(req)) {
        return NextResponse.json({ error: "Unauthorized: Invalid or missing cron secret" }, { status: 401 });
    }

    const execution = await withCronExecutionGovernance(
        "safety_and_kyc_compliance_checks",
        "scheduled",
        undefined,
        async () => {
            const now = new Date();
            // Check expired vendor documents
            const expiredDocs = await db.update(vendorDocuments)
                .set({ status: "expired" })
                .where(and(eq(vendorDocuments.status, "verified"), lt(vendorDocuments.expiryDate, now)))
                .returning();

            return {
                jobName: "safety_and_kyc_compliance_checks",
                itemsProcessed: expiredDocs.length,
                itemsFailed: 0,
                details: { expiredDocsCount: expiredDocs.length },
            };
        }
    );

    if (!execution.success) {
        return NextResponse.json({ error: execution.message }, { status: 429 });
    }

    return NextResponse.json({ success: true, runId: execution.runId, result: execution.result });
}

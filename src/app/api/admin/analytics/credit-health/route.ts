import { NextRequest, NextResponse } from "next/server";
import { listCorporateCreditProfiles, auditClientCreditHealth } from "@/lib/fleet-analytics";

export async function GET(req: NextRequest) {
    try {
        const profiles = await listCorporateCreditProfiles();
        return NextResponse.json({ profiles });
    } catch (err: any) {
        console.error("Credit health GET error:", err);
        return NextResponse.json({ error: err.message || "Failed to list credit profiles" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { clientName, creditLimit, currentOutstanding, averageDaysToPay, organizationId, userId } = body;

        if (!clientName) {
            return NextResponse.json({ error: "Missing clientName" }, { status: 400 });
        }

        const audited = await auditClientCreditHealth({
            clientName,
            creditLimit,
            currentOutstanding,
            averageDaysToPay,
            organizationId,
            userId,
        });

        return NextResponse.json({ success: true, profile: audited }, { status: 201 });
    } catch (err: any) {
        console.error("Credit health POST error:", err);
        return NextResponse.json({ error: err.message || "Failed to audit credit profile" }, { status: 500 });
    }
}

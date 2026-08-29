import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendorPayouts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { recordVendorPayout } from "@/lib/invoicing";

export async function GET(req: NextRequest) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const isStaff = user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN;
        const isVendor = user.role === USER_ROLES.VENDOR;

        if (!isStaff && !isVendor) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const url = new URL(req.url);
        const vendorId = url.searchParams.get("vendorId");

        const payouts = await db.query.vendorPayouts.findMany({
            where: vendorId ? eq(vendorPayouts.vendorId, vendorId) : undefined,
            with: {
                vendor: true,
                ledger: true,
                processor: true,
            },
            orderBy: [desc(vendorPayouts.createdAt)],
        });

        return NextResponse.json({ payouts });
    } catch (e: any) {
        console.error("Vendor Payouts GET Error:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user || (user.role !== USER_ROLES.SUPER_ADMIN && user.role !== USER_ROLES.ADMIN)) {
            return NextResponse.json({ error: "Unauthorized — Admin role required" }, { status: 403 });
        }

        const body = await req.json();
        const { vendorId, ledgerId, amount, payoutMethod, transactionRef, payoutProofUrl, notes } = body;

        if (!vendorId || !ledgerId || !amount) {
            return NextResponse.json({ error: "Missing required fields: vendorId, ledgerId, amount" }, { status: 400 });
        }

        const result = await recordVendorPayout({
            vendorId,
            ledgerId,
            amount: Number(amount),
            payoutMethod: payoutMethod || "bank_transfer",
            transactionRef,
            payoutProofUrl,
            processedBy: user.id,
            notes,
        });

        return NextResponse.json(result, { status: 201 });
    } catch (e: any) {
        console.error("Vendor Payout POST Error:", e);
        return NextResponse.json({ error: e.message || "Failed to record vendor payout" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refunds } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { processRefund } from "@/lib/invoicing";

export async function GET(req: NextRequest) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const isStaff = user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN;

        const refundList = await db.query.refunds.findMany({
            where: !isStaff ? eq(refunds.userId, user.id) : undefined,
            with: {
                creditNote: true,
                payment: true,
                user: true,
                processor: true,
            },
            orderBy: [desc(refunds.createdAt)],
        });

        return NextResponse.json({ refunds: refundList });
    } catch (e: any) {
        console.error("Refunds GET Error:", e);
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
        const { creditNoteId, paymentId, amount, reason, refundMethod, transactionRef, notes } = body;

        if (!amount || !reason) {
            return NextResponse.json({ error: "Missing required fields: amount and reason" }, { status: 400 });
        }

        const result = await processRefund({
            creditNoteId,
            paymentId,
            amount: Number(amount),
            reason,
            processedByUserId: user.id,
            refundMethod,
            transactionRef,
            notes,
        });

        return NextResponse.json(result, { status: 201 });
    } catch (e: any) {
        console.error("Refunds POST Error:", e);
        return NextResponse.json({ error: e.message || "Failed to process refund" }, { status: 500 });
    }
}

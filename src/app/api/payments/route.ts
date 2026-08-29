import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientPayments } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { recordClientPayment } from "@/lib/invoicing";

export async function GET(req: NextRequest) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(req.url);
        const status = url.searchParams.get("status");
        const invoiceId = url.searchParams.get("invoiceId");

        const isStaff = user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SALES_REP;

        const whereConditions: any[] = [];
        if (!isStaff) {
            whereConditions.push(eq(clientPayments.userId, user.id));
        }

        if (status && status !== "all") {
            whereConditions.push(eq(clientPayments.status, status));
        }
        if (invoiceId) {
            whereConditions.push(eq(clientPayments.invoiceId, invoiceId));
        }

        const payments = await db.query.clientPayments.findMany({
            where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
            with: {
                invoice: true,
                user: true,
                verifier: true,
            },
            orderBy: [desc(clientPayments.createdAt)],
        });

        return NextResponse.json({ payments });
    } catch (e: any) {
        console.error("Payments GET Error:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { invoiceId, amount, paymentMethod, transactionRef, paymentProofUrl, notes } = body;

        if (!invoiceId || !amount) {
            return NextResponse.json({ error: "Missing required fields: invoiceId and amount" }, { status: 400 });
        }

        const result = await recordClientPayment({
            invoiceId,
            amount: Number(amount),
            paymentMethod: paymentMethod || "bank_transfer",
            transactionRef,
            paymentProofUrl,
            notes,
            userId: user.id,
        });

        return NextResponse.json(result, { status: 201 });
    } catch (e: any) {
        console.error("Payments POST Error:", e);
        return NextResponse.json({ error: e.message || "Failed to record payment" }, { status: 500 });
    }
}

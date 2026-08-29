import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { creditNotes } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { createCreditNote } from "@/lib/invoicing";

export async function GET(req: NextRequest) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const isStaff = user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SALES_REP;

        const notes = await db.query.creditNotes.findMany({
            where: !isStaff ? eq(creditNotes.userId, user.id) : undefined,
            with: {
                invoice: true,
                user: true,
                issuer: true,
            },
            orderBy: [desc(creditNotes.createdAt)],
        });

        return NextResponse.json({ creditNotes: notes });
    } catch (e: any) {
        console.error("Credit Notes GET Error:", e);
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
        const { invoiceId, amount, reason, notes } = body;

        if (!invoiceId || !amount || !reason) {
            return NextResponse.json({ error: "Missing required fields: invoiceId, amount, and reason" }, { status: 400 });
        }

        const result = await createCreditNote({
            invoiceId,
            amount: Number(amount),
            reason,
            issuedByUserId: user.id,
            notes,
        });

        return NextResponse.json(result, { status: 201 });
    } catch (e: any) {
        console.error("Credit Notes POST Error:", e);
        return NextResponse.json({ error: e.message || "Failed to create credit note" }, { status: 500 });
    }
}

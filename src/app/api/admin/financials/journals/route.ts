import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { financialJournals } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { postBalancedJournal } from "@/lib/finance-sync";

export async function GET(req: NextRequest) {
    try {
        const { error } = await requireAdmin(["super_admin", "admin"]);
        if (error) return error;

        const journals = await db.query.financialJournals.findMany({
            with: {
                entries: true,
            },
            orderBy: [desc(financialJournals.postedAt)],
            limit: 100,
        });

        return NextResponse.json({ journals });
    } catch (e: any) {
        console.error("Financial Journals GET Error:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { error } = await requireAdmin(["super_admin", "admin"]);
        if (error) return error;

        const body = await req.json();
        const { referenceType = "manual_adjustment", referenceId = `MAN-${Date.now()}`, description, entries, postedAt } = body;

        if (!description || !entries || !Array.isArray(entries) || entries.length === 0) {
            return NextResponse.json({ error: "Missing required fields: description and balanced entries array" }, { status: 400 });
        }

        const result = await postBalancedJournal({
            referenceType,
            referenceId,
            description,
            entries,
            postedAt: postedAt ? new Date(postedAt) : new Date(),
        });

        return NextResponse.json(result, { status: 201 });
    } catch (e: any) {
        console.error("Financial Journals POST Error:", e);
        return NextResponse.json({ error: e.message || "Failed to post balanced journal" }, { status: 400 });
    }
}


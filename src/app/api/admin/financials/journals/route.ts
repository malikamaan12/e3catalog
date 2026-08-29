import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { financialJournals } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";

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

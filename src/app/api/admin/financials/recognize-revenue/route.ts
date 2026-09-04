import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { executeDailyRevenueRecognition } from "@/lib/finance-sync";

export async function POST(req: NextRequest) {
    try {
        const { error } = await requireAdmin(["super_admin", "admin"]);
        if (error) return error;

        let forDate = new Date();
        try {
            const body = await req.json();
            if (body.date) {
                forDate = new Date(body.date);
            }
        } catch {
            // body is optional, defaults to today
        }

        const result = await executeDailyRevenueRecognition(forDate);
        return NextResponse.json(result);
    } catch (e: any) {
        console.error("Revenue Recognition API Error:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}

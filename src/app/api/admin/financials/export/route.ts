import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { financialJournals } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
    try {
        const { error } = await requireAdmin(["super_admin", "admin"]);
        if (error) return error;

        const { searchParams } = new URL(req.url);
        const format = searchParams.get("format") || "csv"; // 'csv' | 'quickbooks' | 'xero' | 'json'

        const journals = await db.query.financialJournals.findMany({
            with: {
                entries: true,
            },
            orderBy: [desc(financialJournals.postedAt)],
            limit: 500,
        });

        if (format === "json") {
            let totalDebits = 0;
            let totalCredits = 0;
            journals.forEach((j) => {
                j.entries?.forEach((e) => {
                    totalDebits += Number(e.debit) || 0;
                    totalCredits += Number(e.credit) || 0;
                });
            });

            return NextResponse.json({
                exportType: "general_ledger",
                exportedAt: new Date().toISOString(),
                totalJournals: journals.length,
                totalDebits: Math.round(totalDebits * 100) / 100,
                totalCredits: Math.round(totalCredits * 100) / 100,
                journals,
            });
        }

        // CSV formatting
        const rows: string[] = [];

        if (format === "quickbooks") {
            // QuickBooks Online Journal Entry Import Header
            rows.push('"*JournalNo","*JournalDate","Memo","*AccountName","*Debits","*Credits","Description"');
            for (const j of journals) {
                const dateStr = new Date(j.postedAt).toISOString().split("T")[0];
                for (const e of j.entries || []) {
                    rows.push([
                        `"${j.journalNumber}"`,
                        `"${dateStr}"`,
                        `"${(e.memo || j.description || "").replace(/"/g, '""')}"`,
                        `"${(e.accountName || e.accountCode).replace(/"/g, '""')}"`,
                        e.debit > 0 ? e.debit.toFixed(2) : "",
                        e.credit > 0 ? e.credit.toFixed(2) : "",
                        `"${(j.description || "").replace(/"/g, '""')}"`,
                    ].join(","));
                }
            }
        } else if (format === "xero") {
            // Xero Manual Journal Import Header
            rows.push('"*Narration","*Date","*Description","*AccountCode","*TaxType","*Amount"');
            for (const j of journals) {
                const dateStr = new Date(j.postedAt).toISOString().split("T")[0];
                for (const e of j.entries || []) {
                    const amount = e.debit > 0 ? e.debit.toFixed(2) : (-e.credit).toFixed(2);
                    rows.push([
                        `"${(j.description || "").replace(/"/g, '""')}"`,
                        `"${dateStr}"`,
                        `"${(e.memo || e.accountName).replace(/"/g, '""')}"`,
                        `"${e.accountCode}"`,
                        '"No VAT"',
                        amount,
                    ].join(","));
                }
            }
        } else {
            // Standard Full General Ledger CSV
            rows.push('"Journal Number","Posted Date","Reference Type","Reference ID","Account Code","Account Name","Debit (QAR)","Credit (QAR)","Memo","Journal Description"');
            for (const j of journals) {
                const dateStr = new Date(j.postedAt).toISOString().split("T")[0];
                for (const e of j.entries || []) {
                    rows.push([
                        `"${j.journalNumber}"`,
                        `"${dateStr}"`,
                        `"${j.referenceType}"`,
                        `"${j.referenceId}"`,
                        `"${e.accountCode}"`,
                        `"${e.accountName.replace(/"/g, '""')}"`,
                        Number(e.debit || 0).toFixed(2),
                        Number(e.credit || 0).toFixed(2),
                        `"${(e.memo || "").replace(/"/g, '""')}"`,
                        `"${(j.description || "").replace(/"/g, '""')}"`,
                    ].join(","));
                }
            }
        }

        const csvContent = rows.join("\r\n");
        const filename = `gl-journals-${format}-${new Date().toISOString().split("T")[0]}.csv`;

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (e: any) {
        console.error("Financial Journals Export Error:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}

/**
 * Advanced ERP Synchronization & Double-Entry Financial Journal Engine
 * Authoritative debits and credits, chart of accounts, and daily revenue recognition.
 */

import { db } from "@/lib/db";
import { financialJournals, journalEntries, bookings } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export const CHART_OF_ACCOUNTS = {
    CASH_AND_BANK: { code: "1010", name: "Cash and Bank Operations" },
    ACCOUNTS_RECEIVABLE: { code: "1100", name: "Accounts Receivable — Clients" },
    FLEET_ASSETS_CAPEX: { code: "1200", name: "Capital Fleet Assets" },
    ACCUMULATED_DEPRECIATION: { code: "1300", name: "Accumulated Depreciation" },
    ACCOUNTS_PAYABLE_VENDORS: { code: "2000", name: "Accounts Payable — Vendors" },
    SECURITY_DEPOSITS_HELD: { code: "2100", name: "Customer Security Deposits Held" },
    UNEARNED_DEFERRED_REVENUE: { code: "2200", name: "Unearned / Deferred Rental Revenue" },
    RENTAL_REVENUE: { code: "4000", name: "Realized Equipment Rental Revenue" },
    LOGISTICS_AND_LABOR_REVENUE: { code: "4100", name: "Logistics and Crew Operations Revenue" },
    SUBRENTAL_CROSSHIRE_EXPENSE: { code: "5000", name: "Sub-Rental and Cross-Hire Cost" },
    MAINTENANCE_EXPENSE: { code: "5100", name: "Preventive & Corrective Maintenance Expense" },
    DEPRECIATION_EXPENSE: { code: "5200", name: "Fleet Asset Depreciation Expense" },
};

export interface JournalEntryLine {
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    memo?: string;
}

/**
 * Creates and posts a balanced double-entry financial journal.
 * Validates that sum(debit) === sum(credit).
 */
export async function postBalancedJournal(params: {
    referenceType: "invoice" | "payment" | "credit_note" | "payout" | "settlement" | "reversal" | "revenue_recognition" | "depreciation" | "manual_adjustment" | string;
    referenceId: string;
    description: string;
    entries: JournalEntryLine[];
    postedAt?: Date;
}) {
    const { referenceType, referenceId, description, entries, postedAt = new Date() } = params;

    // 1. Balance verification
    let totalDebit = 0;
    let totalCredit = 0;

    for (const e of entries) {
        totalDebit += Math.round((Number(e.debit) || 0) * 100);
        totalCredit += Math.round((Number(e.credit) || 0) * 100);
    }

    if (totalDebit !== totalCredit) {
        const diff = Math.abs(totalDebit - totalCredit) / 100;
        throw new Error(`Unbalanced journal rejected: Total Debits (${totalDebit / 100}) != Total Credits (${totalCredit / 100}). Difference: QAR ${diff}`);
    }

    // 2. Generate sequential journal number
    const year = postedAt.getFullYear();
    const journalNumber = `JRN-${year}-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`;
    const journalId = uuid();

    // 3. Atomically persist journal and entries
    await db.transaction(async (tx) => {
        await tx.insert(financialJournals).values({
            id: journalId,
            journalNumber,
            referenceType,
            referenceId,
            description,
            postedAt,
        });

        for (const entry of entries) {
            await tx.insert(journalEntries).values({
                id: uuid(),
                journalId,
                accountCode: entry.accountCode,
                accountName: entry.accountName,
                debit: entry.debit || 0,
                credit: entry.credit || 0,
                memo: entry.memo || null,
            });
        }
    });

    const created = await db.query.financialJournals.findFirst({
        where: eq(financialJournals.id, journalId),
        with: { entries: true },
    });

    return {
        success: true,
        journalNumber,
        journalId,
        balancedAmount: totalDebit / 100,
        journal: created,
    };
}

/**
 * Executes pro-rata daily revenue recognition for active on-rent contracts.
 */
export async function executeDailyRevenueRecognition(forDate = new Date()) {
    const todayStr = forDate.toISOString().split("T")[0];

    // Find active on-rent bookings active on this date
    const activeRentals = await db.query.bookings.findMany({
        where: and(
            sql`${bookings.startDate} <= ${forDate}`,
            sql`${bookings.endDate} >= ${forDate}`,
            eq(bookings.status, "dispatched")
        ),
        limit: 50,
    });

    const postedJournals = [];

    for (const b of activeRentals) {
        const start = new Date(b.startDate);
        const end = new Date(b.endDate);
        const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const totalPrice = Number(b.totalPrice) || 0;
        const dailyEarn = Math.round((totalPrice / totalDays) * 100) / 100;

        if (dailyEarn <= 0) continue;

        // Post balanced recognition journal:
        // Debit: 2200_UNEARNED_DEFERRED_REVENUE
        // Credit: 4000_EQUIPMENT_RENTAL_REVENUE
        const res = await postBalancedJournal({
            referenceType: "revenue_recognition",
            referenceId: b.id,
            description: `Daily pro-rata revenue recognition for Booking #${b.id.slice(0, 8)} (${todayStr})`,
            postedAt: forDate,
            entries: [
                {
                    accountCode: CHART_OF_ACCOUNTS.UNEARNED_DEFERRED_REVENUE.code,
                    accountName: CHART_OF_ACCOUNTS.UNEARNED_DEFERRED_REVENUE.name,
                    debit: dailyEarn,
                    credit: 0,
                    memo: `Unearned revenue realized (${todayStr})`,
                },
                {
                    accountCode: CHART_OF_ACCOUNTS.RENTAL_REVENUE.code,
                    accountName: CHART_OF_ACCOUNTS.RENTAL_REVENUE.name,
                    debit: 0,
                    credit: dailyEarn,
                    memo: `Realized rental revenue (${todayStr})`,
                },
            ],
        });

        postedJournals.push(res);
    }

    return {
        success: true,
        date: todayStr,
        processedCount: activeRentals.length,
        journalsCreated: postedJournals.length,
        postedJournals,
    };
}

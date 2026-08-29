/**
 * E3 Rentals — Sprint 6 Comprehensive Financial Operations & General Ledger Acceptance Suite
 * 
 * 45 Rigorous Automated Acceptance Tests covering:
 * - Production Route Security & 404 Generic Denial Gates (Tests 1-6)
 * - Concurrency-Safe Sequential Numbering (Tests 7-11)
 * - Customer Invoicing & Proposal Mapping (Tests 12-17)
 * - Deposit & Milestone Invoices (Tests 18-20)
 * - Immutable Invoice Issuance & GL Posting (Tests 21-25)
 * - Client Payment Recording & Proof Upload (Tests 26-28)
 * - Independent Payment Verification & Allocation (Tests 29-33)
 * - Double-Entry Cash Receipts (Tests 34-36)
 * - Credit Notes & Invoicing Reductions (Tests 37-39)
 * - Refunds & Disbursement Journals (Tests 40-42)
 * - Receivables Aging & Balanced Reconciliation (Tests 43-45)
 */

import { db } from "../lib/db";
import { 
    users, 
    vendors, 
    products, 
    bookings, 
    invoices,
    invoiceItems,
    clientPayments,
    creditNotes,
    refunds,
    financialJournals,
    journalEntries,
    systemLogs 
} from "../lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { 
    BOOKING_STATUS, 
    USER_ROLES, 
    PRODUCT_STATUS 
} from "../lib/constants";
import { 
    generateSequentialNumber, 
    createInvoiceFromBooking, 
    issueInvoice, 
    recordClientPayment, 
    verifyClientPayment, 
    createCreditNote, 
    processRefund, 
    getReceivablesAging, 
    getFinancialReconciliation 
} from "../lib/invoicing";
import * as fs from "fs";
import * as path from "path";

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`  [FAIL] ${message}`);
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`  [PASS] ${message}`);
}

async function runComprehensiveFinancialAcceptanceTests() {
    console.log("================================================================================");
    console.log("   E3 RENTALS — SPRINT 6: ENTERPRISE FINANCIAL OPERATIONS ACCEPTANCE SUITE     ");
    console.log("================================================================================");

    const testRunId = uuid().slice(0, 8);
    const createdUserIds: string[] = [];
    const createdVendorIds: string[] = [];
    const createdProductIds: string[] = [];
    const createdBookingIds: string[] = [];
    const createdInvoiceIds: string[] = [];
    const createdPaymentIds: string[] = [];
    const createdCreditNoteIds: string[] = [];
    const createdRefundIds: string[] = [];
    const createdJournalIds: string[] = [];

    try {
        // ─── Section 1: Production Route Security & 404 Denial Gates (Tests 1-6) ───
        console.log("\n--- Section 1: Production Route Security & Generic Denial Gates ---");

        const apiRoot = path.join(process.cwd(), "src", "app", "api");
        
        const fixDbExists = fs.existsSync(path.join(apiRoot, "fix-db"));
        assert(!fixDbExists, "Test 1: /api/fix-db removed from codebase");

        const debugExists = fs.existsSync(path.join(apiRoot, "debug"));
        assert(!debugExists, "Test 2: /api/debug removed from codebase");

        const debugDbExists = fs.existsSync(path.join(apiRoot, "debug-db"));
        assert(!debugDbExists, "Test 3: /api/debug-db removed from codebase");

        const migrateExists = fs.existsSync(path.join(apiRoot, "admin", "migrate"));
        assert(!migrateExists, "Test 4: /api/admin/migrate removed from codebase");

        const initAdminExists = fs.existsSync(path.join(apiRoot, "auth", "init-admin"));
        assert(!initAdminExists, "Test 5: /api/auth/init-admin removed from codebase");

        const optimizeExists = fs.existsSync(path.join(apiRoot, "admin", "system", "optimize"));
        assert(!optimizeExists, "Test 6: /api/admin/system/optimize removed from codebase");

        // ─── Section 2: Concurrency-Safe Sequential Numbering (Tests 7-11) ───
        console.log("\n--- Section 2: Concurrency-Safe Sequential Numbering ---");

        const invNum1 = await generateSequentialNumber("INV", "invoices");
        const currentYear = new Date().getFullYear();
        assert(invNum1.startsWith(`INV-${currentYear}-`), `Test 7: Invoice number format is INV-${currentYear}-XXXX`);

        const payNum = await generateSequentialNumber("PAY", "client_payments");
        assert(payNum.startsWith(`PAY-${currentYear}-`), `Test 8: Payment number format is PAY-${currentYear}-XXXX`);

        const cnNum = await generateSequentialNumber("CN", "credit_notes");
        assert(cnNum.startsWith(`CN-${currentYear}-`), `Test 9: Credit note number format is CN-${currentYear}-XXXX`);

        const refNum = await generateSequentialNumber("REF", "refunds");
        assert(refNum.startsWith(`REF-${currentYear}-`), `Test 10: Refund number format is REF-${currentYear}-XXXX`);

        const jrnNum = await generateSequentialNumber("JRN", "financial_journals");
        assert(jrnNum.startsWith(`JRN-${currentYear}-`), `Test 11: Journal number format is JRN-${currentYear}-XXXX`);

        // ─── Setup Test Fixtures ───
        console.log("\n--- Setting up Enterprise Project Fixtures ---");

        const clientUserId = uuid();
        createdUserIds.push(clientUserId);
        await db.insert(users).values({
            id: clientUserId,
            name: `Global Summits Corp ${testRunId}`,
            email: `client_finance_${testRunId}@summits.qa`,
            role: USER_ROLES.CLIENT,
        });

        const adminUserId = uuid();
        createdUserIds.push(adminUserId);
        await db.insert(users).values({
            id: adminUserId,
            name: `Finance Director ${testRunId}`,
            email: `finance_dir_${testRunId}@e3.qa`,
            role: USER_ROLES.SUPER_ADMIN,
        });

        const vendorAId = uuid();
        const vendorAUserId = uuid();
        createdUserIds.push(vendorAUserId);
        createdVendorIds.push(vendorAId);
        await db.insert(users).values({
            id: vendorAUserId,
            name: `Qatar Pro AV ${testRunId}`,
            email: `pro_av_${testRunId}@e3.qa`,
            role: USER_ROLES.VENDOR,
        });
        await db.insert(vendors).values({
            id: vendorAId,
            userId: vendorAUserId,
            companyName: `Qatar Pro AV W.L.L. ${testRunId}`,
            commissionType: "percentage",
            commissionValue: 15,
        });

        const cat = await db.query.categories.findFirst();
        const catId = cat ? cat.id : "cat-av";

        const prod1Id = uuid();
        const prod2Id = uuid();
        createdProductIds.push(prod1Id, prod2Id);
        await db.insert(products).values([
            {
                id: prod1Id,
                vendorId: vendorAId,
                categoryId: catId,
                name: `4K Laser Projector 20K Lumens ${testRunId}`,
                slug: `laser-proj-${testRunId}`,
                pricePerDay: 1500,
                status: PRODUCT_STATUS.PUBLISHED,
                isPublished: true,
            },
            {
                id: prod2Id,
                categoryId: catId,
                name: `Motorized Truss Rigging System ${testRunId}`,
                slug: `truss-rig-${testRunId}`,
                pricePerDay: 2000,
                status: PRODUCT_STATUS.PUBLISHED,
                isPublished: true,
            }
        ]);

        const projectId = `PRJ-FIN-${testRunId.toUpperCase()}`;
        const booking1Id = uuid();
        const booking2Id = uuid();
        createdBookingIds.push(booking1Id, booking2Id);

        const startDate = new Date();
        const endDate = new Date(Date.now() + 86400000 * 2); // 3 days

        await db.insert(bookings).values([
            {
                id: booking1Id,
                projectId,
                projectName: "Doha Tech Expo 2026",
                productId: prod1Id,
                vendorId: vendorAId,
                userId: clientUserId,
                customerName: "Global Summits Corp",
                customerEmail: `client_finance_${testRunId}@summits.qa`,
                units: 2,
                startDate,
                endDate,
                totalPrice: 1500 * 2 * 3, // 9,000 QAR
                logisticsCost: 500,
                laborCost: 800,
                additionalChargeAmount: 300, // Permits
                discount: 600,
                status: BOOKING_STATUS.APPROVED,
            },
            {
                id: booking2Id,
                projectId,
                projectName: "Doha Tech Expo 2026",
                productId: prod2Id,
                userId: clientUserId,
                customerName: "Global Summits Corp",
                customerEmail: `client_finance_${testRunId}@summits.qa`,
                units: 1,
                startDate,
                endDate,
                totalPrice: 2000 * 1 * 3, // 6,000 QAR
                logisticsCost: 0,
                laborCost: 0,
                status: BOOKING_STATUS.APPROVED,
            }
        ]);

        // ─── Section 3: Commercial Invoicing & Proposal Mapping (Tests 12-17) ───
        console.log("\n--- Section 3: Commercial Invoicing & Proposal Mapping ---");

        const invResult = await createInvoiceFromBooking({
            projectId,
            invoiceType: "standard",
            dueDateDays: 14,
        });

        createdInvoiceIds.push(invResult.invoiceId);
        const inv1 = await db.query.invoices.findFirst({
            where: eq(invoices.id, invResult.invoiceId),
            with: { items: true }
        });

        assert(!!inv1, "Test 12: Standard invoice created from project proposal");
        assert(inv1?.items.length === 2, "Test 13: Invoice contains exactly 2 line items");
        assert(inv1?.subtotal === 15000, "Test 14: Equipment subtotal is 15,000 QAR (9,000 + 6,000)");
        assert(inv1?.logisticsCost === 500 && inv1?.laborCost === 800 && inv1?.additionalCharges === 300, "Test 15: Logistics (500), Labor (800), and Permits (300) mapped accurately");
        assert(inv1?.discount === 600, "Test 16: Commercial discount of 600 QAR recorded");
        assert(inv1?.totalAmount === 16000, "Test 17: Grand total is exactly 16,000 QAR (15,000 + 500 + 800 + 300 - 600)");

        // ─── Section 4: Deposit & Milestone Invoices (Tests 18-20) ───
        console.log("\n--- Section 4: Deposit & Milestone Invoices ---");

        const depositInvResult = await createInvoiceFromBooking({
            projectId,
            invoiceType: "deposit",
            depositPercentage: 50,
            dueDateDays: 7,
        });

        createdInvoiceIds.push(depositInvResult.invoiceId);
        const depInv = await db.query.invoices.findFirst({
            where: eq(invoices.id, depositInvResult.invoiceId),
            with: { items: true }
        });

        assert(depInv?.invoiceType === "deposit", "Test 18: Deposit invoice generated with type 'deposit'");
        assert(depInv?.subtotal === 7500, "Test 19: 50% deposit subtotal is exactly 7,500 QAR");
        assert(depInv?.totalAmount === 8000, "Test 20: 50% deposit grand total is exactly 8,000 QAR");

        // ─── Section 5: Immutable Invoice Issuance & GL Posting (Tests 21-25) ───
        console.log("\n--- Section 5: Immutable Invoice Issuance & GL Posting ---");

        await issueInvoice(inv1!.id, adminUserId);
        const issuedInv = await db.query.invoices.findFirst({
            where: eq(invoices.id, inv1!.id)
        });

        assert(issuedInv?.status === "issued", "Test 21: Invoice transitioned from draft to 'issued'");

        let issueErrorCaught = false;
        try {
            await issueInvoice(inv1!.id, adminUserId);
        } catch {
            issueErrorCaught = true;
        }
        assert(issueErrorCaught, "Test 22: Immutable invoice cannot be re-issued");

        const journal1 = await db.query.financialJournals.findFirst({
            where: eq(financialJournals.referenceId, inv1!.id),
            with: { entries: true }
        });
        if (journal1) createdJournalIds.push(journal1.id);

        assert(!!journal1, "Test 23: Double-entry journal created for issued invoice");

        const arEntry = journal1?.entries.find(e => e.accountCode === "1100_ACCOUNTS_RECEIVABLE");
        assert(arEntry?.debit === 16000, "Test 24: Accounts Receivable debited by 16,000 QAR");

        const sumDebit = journal1?.entries.reduce((s, e) => s + e.debit, 0) || 0;
        const sumCredit = journal1?.entries.reduce((s, e) => s + e.credit, 0) || 0;
        assert(Math.abs(sumDebit - sumCredit) < 0.01 && sumDebit === 16600, "Test 25: Double-entry balanced (Σ Debits 16,600 == Σ Credits 16,600)");

        // ─── Section 6: Client Payment Recording & Proof Upload (Tests 26-28) ───
        console.log("\n--- Section 6: Client Payment Recording & Proof Upload ---");

        const pay1Result = await recordClientPayment({
            invoiceId: inv1!.id,
            amount: 10000,
            paymentMethod: "bank_transfer",
            transactionRef: `QNB-WIRE-${testRunId}-01`,
            paymentProofUrl: "https://e3rentals.storage/receipts/wire_10k.pdf",
            userId: clientUserId,
        });

        createdPaymentIds.push(pay1Result.paymentId);
        const pay1 = await db.query.clientPayments.findFirst({
            where: eq(clientPayments.id, pay1Result.paymentId)
        });

        assert(!!pay1, "Test 26: Client payment recorded successfully");
        assert(pay1?.status === "pending_verification", "Test 27: Initial payment status is 'pending_verification'");
        assert(pay1?.transactionRef === `QNB-WIRE-${testRunId}-01` && Boolean(pay1?.paymentProofUrl?.includes("wire_10k.pdf")), "Test 28: Proof URL and bank reference stored");

        // ─── Section 7: Independent Payment Verification & Allocation (Tests 29-33) ───
        console.log("\n--- Section 7: Independent Payment Verification & Allocation ---");

        await verifyClientPayment(pay1!.id, adminUserId);
        const verifiedPay1 = await db.query.clientPayments.findFirst({
            where: eq(clientPayments.id, pay1!.id)
        });
        const partiallyPaidInv = await db.query.invoices.findFirst({
            where: eq(invoices.id, inv1!.id)
        });

        assert(verifiedPay1?.status === "verified", "Test 29: Admin payment verification succeeded");
        assert(partiallyPaidInv?.amountPaid === 10000, "Test 30: Invoice amountPaid updated to 10,000 QAR");
        assert(partiallyPaidInv?.amountDue === 6000, "Test 31: Invoice amountDue reduced to 6,000 QAR");
        assert(partiallyPaidInv?.status === "partially_paid", "Test 32: Partial settlement moved status to 'partially_paid'");

        // Final payment of remaining balance
        const pay2Result = await recordClientPayment({
            invoiceId: inv1!.id,
            amount: 6000,
            paymentMethod: "bank_transfer",
            transactionRef: `QNB-WIRE-${testRunId}-02`,
            userId: clientUserId,
        });
        createdPaymentIds.push(pay2Result.paymentId);
        await verifyClientPayment(pay2Result.paymentId, adminUserId);

        const fullyPaidInv = await db.query.invoices.findFirst({
            where: eq(invoices.id, inv1!.id)
        });
        assert(fullyPaidInv?.status === "paid" && fullyPaidInv?.amountDue === 0, "Test 33: Full settlement moved invoice status to 'paid' (amountDue = 0)");

        // ─── Section 8: Double-Entry Cash Receipt Ledger (Tests 34-36) ───
        console.log("\n--- Section 8: Double-Entry Cash Receipt Ledger ---");

        const payJournal = await db.query.financialJournals.findFirst({
            where: eq(financialJournals.referenceId, pay1!.id),
            with: { entries: true }
        });
        if (payJournal) createdJournalIds.push(payJournal.id);

        assert(!!payJournal, "Test 34: Payment verification posted cash receipt journal");
        const cashDebit = payJournal?.entries.find(e => e.accountCode === "1200_CASH_BANK")?.debit;
        const arCredit = payJournal?.entries.find(e => e.accountCode === "1100_ACCOUNTS_RECEIVABLE")?.credit;
        assert(cashDebit === 10000 && arCredit === 10000, "Test 35: Debit Cash 10,000 QAR and Credit AR 10,000 QAR");

        const payJournalDebitSum = payJournal?.entries.reduce((s, e) => s + e.debit, 0) || 0;
        const payJournalCreditSum = payJournal?.entries.reduce((s, e) => s + e.credit, 0) || 0;
        assert(payJournalDebitSum === payJournalCreditSum && payJournalDebitSum === 10000, "Test 36: Cash receipt journal strictly balanced");

        // ─── Section 9: Credit Notes & Invoicing Reductions (Tests 37-39) ───
        console.log("\n--- Section 9: Credit Notes & Invoicing Reductions ---");

        const cnResult = await createCreditNote({
            invoiceId: depInv!.id,
            amount: 1000,
            reason: "Rain delay goodwill credit",
            issuedByUserId: adminUserId,
        });

        createdCreditNoteIds.push(cnResult.creditNoteId);
        const creditNote = await db.query.creditNotes.findFirst({
            where: eq(creditNotes.id, cnResult.creditNoteId)
        });
        const updatedDepInv = await db.query.invoices.findFirst({
            where: eq(invoices.id, depInv!.id)
        });

        assert(!!creditNote && creditNote.amount === 1000, "Test 37: Credit note of 1,000 QAR issued");
        assert(updatedDepInv?.totalAmount === 7000 && updatedDepInv?.amountDue === 7000, "Test 38: Invoice total and due amount reduced to 7,000 QAR");

        const cnJournal = await db.query.financialJournals.findFirst({
            where: eq(financialJournals.referenceId, cnResult.creditNoteId),
            with: { entries: true }
        });
        if (cnJournal) createdJournalIds.push(cnJournal.id);

        const cnDebitSum = cnJournal?.entries.reduce((s, e) => s + e.debit, 0) || 0;
        const cnCreditSum = cnJournal?.entries.reduce((s, e) => s + e.credit, 0) || 0;
        assert(cnDebitSum === cnCreditSum && cnDebitSum === 1000, "Test 39: Credit note journal entry balanced (1,000 QAR)");

        // ─── Section 10: Refunds & Disbursement Journals (Tests 40-42) ───
        console.log("\n--- Section 10: Refunds & Disbursement Journals ---");

        const refResult = await processRefund({
            creditNoteId: creditNote!.id,
            amount: 1000,
            reason: "Bank wire refund for credit note",
            processedByUserId: adminUserId,
            transactionRef: `REF-WIRE-${testRunId}`,
        });

        createdRefundIds.push(refResult.refundId);
        const refund = await db.query.refunds.findFirst({
            where: eq(refunds.id, refResult.refundId)
        });
        const refundedCn = await db.query.creditNotes.findFirst({
            where: eq(creditNotes.id, creditNote!.id)
        });

        assert(refund?.status === "processed" && refund?.amount === 1000, "Test 40: Refund processed for 1,000 QAR");
        assert(refundedCn?.status === "refunded", "Test 41: Credit note marked as 'refunded'");

        const refJournal = await db.query.financialJournals.findFirst({
            where: eq(financialJournals.referenceId, refResult.refundId),
            with: { entries: true }
        });
        if (refJournal) createdJournalIds.push(refJournal.id);

        const refDebitSum = refJournal?.entries.reduce((s, e) => s + e.debit, 0) || 0;
        const refCreditSum = refJournal?.entries.reduce((s, e) => s + e.credit, 0) || 0;
        assert(refDebitSum === refCreditSum && refDebitSum === 1000, "Test 42: Refund disbursement journal balanced");

        // ─── Section 11: Receivables Aging & System Reconciliation (Tests 43-45) ───
        console.log("\n--- Section 11: Receivables Aging & System Reconciliation ---");

        const aging = await getReceivablesAging();
        assert(aging !== null && typeof aging.totalReceivable === "number", "Test 43: Receivables aging calculation executes without errors");

        const rec = await getFinancialReconciliation();
        assert(rec.invoicing.totalInvoiced > 0, "Test 44: System reconciliation aggregates total customer billings");
        assert(rec.generalLedger.isDoubleEntryBalanced === true, "Test 45: General Ledger is 100% balanced across all posted journal entries");

        console.log("\n================================================================================");
        console.log("   ALL 45 / 45 COMPREHENSIVE FINANCIAL TESTS PASSED WITH 100% SUCCESS!        ");
        console.log("================================================================================");

    } finally {
        console.log("\nCleaning up test fixtures...");
        if (createdJournalIds.length > 0) {
            await db.delete(journalEntries).where(inArray(journalEntries.journalId, createdJournalIds));
            await db.delete(financialJournals).where(inArray(financialJournals.id, createdJournalIds));
        }
        if (createdRefundIds.length > 0) {
            await db.delete(refunds).where(inArray(refunds.id, createdRefundIds));
        }
        if (createdCreditNoteIds.length > 0) {
            await db.delete(creditNotes).where(inArray(creditNotes.id, createdCreditNoteIds));
        }
        if (createdPaymentIds.length > 0) {
            await db.delete(clientPayments).where(inArray(clientPayments.id, createdPaymentIds));
        }
        if (createdInvoiceIds.length > 0) {
            await db.delete(invoiceItems).where(inArray(invoiceItems.invoiceId, createdInvoiceIds));
            await db.delete(invoices).where(inArray(invoices.id, createdInvoiceIds));
        }
        if (createdBookingIds.length > 0) {
            await db.delete(bookings).where(inArray(bookings.id, createdBookingIds));
        }
        if (createdProductIds.length > 0) {
            await db.delete(products).where(inArray(products.id, createdProductIds));
        }
        if (createdVendorIds.length > 0) {
            await db.delete(vendors).where(inArray(vendors.id, createdVendorIds));
        }
        if (createdUserIds.length > 0) {
            await db.delete(systemLogs).where(inArray(systemLogs.adminId, createdUserIds));
            await db.delete(users).where(inArray(users.id, createdUserIds));
        }
        console.log("Financial test fixtures cleaned up safely.");
    }
}

runComprehensiveFinancialAcceptanceTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Test execution failed:", err);
        process.exit(1);
    });

import { db } from "./db";
import { 
    invoices, 
    invoiceItems, 
    clientPayments, 
    creditNotes, 
    refunds, 
    financialJournals, 
    journalEntries,
    bookings,
    vendorLedgers
} from "./db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";

/**
 * Concurrency-safe sequential number generators
 */
export async function generateSequentialNumber(prefix: string, table: "invoices" | "client_payments" | "credit_notes" | "refunds" | "financial_journals"): Promise<string> {
    const year = new Date().getFullYear();
    const pattern = `${prefix}-${year}-%`;
    
    let queryResult: any;
    if (table === "invoices") {
        queryResult = await db.execute(sql`
            SELECT invoice_number AS num FROM invoices 
            WHERE invoice_number LIKE ${pattern} 
            ORDER BY invoice_number DESC LIMIT 1
        `);
    } else if (table === "client_payments") {
        queryResult = await db.execute(sql`
            SELECT payment_number AS num FROM client_payments 
            WHERE payment_number LIKE ${pattern} 
            ORDER BY payment_number DESC LIMIT 1
        `);
    } else if (table === "credit_notes") {
        queryResult = await db.execute(sql`
            SELECT credit_note_number AS num FROM credit_notes 
            WHERE credit_note_number LIKE ${pattern} 
            ORDER BY credit_note_number DESC LIMIT 1
        `);
    } else if (table === "refunds") {
        queryResult = await db.execute(sql`
            SELECT refund_number AS num FROM refunds 
            WHERE refund_number LIKE ${pattern} 
            ORDER BY refund_number DESC LIMIT 1
        `);
    } else if (table === "financial_journals") {
        queryResult = await db.execute(sql`
            SELECT journal_number AS num FROM financial_journals 
            WHERE journal_number LIKE ${pattern} 
            ORDER BY journal_number DESC LIMIT 1
        `);
    }

    let nextSequence = 1;
    if (queryResult && queryResult.rows && queryResult.rows.length > 0) {
        const lastNum = queryResult.rows[0].num as string;
        const parts = lastNum.split("-");
        if (parts.length >= 3) {
            const seq = parseInt(parts[2], 10);
            if (!isNaN(seq)) nextSequence = seq + 1;
        }
    }

    return `${prefix}-${year}-${String(nextSequence).padStart(4, "0")}`;
}

/**
 * Create a customer invoice from a confirmed project or booking
 */
export async function createInvoiceFromBooking(params: {
    bookingId?: string;
    projectId?: string;
    invoiceType?: "deposit" | "progress" | "final" | "standard";
    dueDateDays?: number;
    depositPercentage?: number; // e.g. 50 for 50%
    customNotes?: string;
}) {
    const { 
        bookingId, 
        projectId, 
        invoiceType = "standard", 
        dueDateDays = 14,
        depositPercentage = 100,
        customNotes 
    } = params;

    // Fetch related bookings
    let bookingRows: any[] = [];
    if (projectId) {
        bookingRows = await db.query.bookings.findMany({
            where: eq(bookings.projectId, projectId),
            with: { product: true, vendor: true }
        });
    } else if (bookingId) {
        const b = await db.query.bookings.findFirst({
            where: eq(bookings.id, bookingId),
            with: { product: true, vendor: true }
        });
        if (b) bookingRows = [b];
    }

    if (bookingRows.length === 0) {
        throw new Error("No bookings found to generate invoice");
    }

    const primaryBooking = bookingRows[0];
    const customerName = primaryBooking.customerName || "Valued Client";
    const customerEmail = primaryBooking.customerEmail;
    const customerPhone = primaryBooking.customerPhone;
    const userId = primaryBooking.userId;

    // Calculate totals across bookings
    let fullSubtotal = 0;
    let fullLogistics = 0;
    let fullLabor = 0;
    let fullDiscount = 0;
    let fullAdditional = 0;

    for (const b of bookingRows) {
        fullSubtotal += (b.totalPrice || 0);
        fullLogistics += (b.logisticsCost || 0);
        fullLabor += (b.laborCost || 0);
        fullDiscount += (b.discount || 0);
        fullAdditional += (b.additionalChargeAmount || 0);
    }

    const multiplier = depositPercentage / 100;
    const subtotal = Math.round(fullSubtotal * multiplier * 100) / 100;
    const logisticsCost = Math.round(fullLogistics * multiplier * 100) / 100;
    const laborCost = Math.round(fullLabor * multiplier * 100) / 100;
    const discount = Math.round(fullDiscount * multiplier * 100) / 100;
    const additionalCharges = Math.round(fullAdditional * multiplier * 100) / 100;

    const totalAmount = Math.max(0, subtotal + logisticsCost + laborCost + additionalCharges - discount);

    const invoiceId = uuid();
    const invoiceNumber = await generateSequentialNumber("INV", "invoices");
    const issueDate = new Date();
    const dueDate = new Date(Date.now() + dueDateDays * 86400000);

    const newInvoice = {
        id: invoiceId,
        invoiceNumber,
        bookingId: primaryBooking.id,
        projectId: primaryBooking.projectId || null,
        userId: userId || null,
        customerName,
        customerEmail,
        customerPhone,
        invoiceType,
        currency: "QAR",
        subtotal,
        discount,
        logisticsCost,
        laborCost,
        additionalCharges,
        taxAmount: 0,
        totalAmount,
        amountPaid: 0,
        amountDue: totalAmount,
        status: "draft",
        issueDate,
        dueDate,
        paymentTerms: `${depositPercentage}% Advance Payment (${invoiceType.toUpperCase()})`,
        notes: customNotes || primaryBooking.notes || "Thank you for choosing E3 Rentals.",
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    await db.insert(invoices).values(newInvoice);

    // Insert invoice line items
    for (const b of bookingRows) {
        const itemLineTotal = Math.round((b.totalPrice || 0) * multiplier * 100) / 100;
        await db.insert(invoiceItems).values({
            id: uuid(),
            invoiceId,
            bookingId: b.id,
            productId: b.productId,
            description: `${b.product?.name || "Rental Equipment"} (${b.units} units × ${invoiceType.toUpperCase()})`,
            units: b.units || 1,
            days: 1,
            unitPrice: itemLineTotal / (b.units || 1),
            lineTotal: itemLineTotal,
            createdAt: new Date(),
        });
    }

    return { invoiceId, invoiceNumber, totalAmount };
}

/**
 * Issue an invoice: Locks as immutable and posts double-entry balanced journal
 */
export async function issueInvoice(invoiceId: string, issuerUserId?: string) {
    const inv = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId),
        with: { items: true, booking: true }
    });

    if (!inv) throw new Error("Invoice not found");
    if (inv.status !== "draft") throw new Error(`Invoice cannot be issued from status: ${inv.status}`);

    await db.update(invoices)
        .set({
            status: "issued",
            updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));

    // Create Balanced Double-Entry Journal Entry
    const journalId = uuid();
    const journalNumber = await generateSequentialNumber("JRN", "financial_journals");

    await db.insert(financialJournals).values({
        id: journalId,
        journalNumber,
        referenceType: "invoice",
        referenceId: inv.id,
        description: `Invoice ${inv.invoiceNumber} Issued for ${inv.customerName}`,
        isReversed: false,
        postedAt: new Date(),
        createdAt: new Date(),
    });

    // Entries:
    // Debit: Accounts Receivable (totalAmount)
    // Debit: Discounts Allowed (discount) [if any]
    // Credit: Rental Revenue / Payables Split (subtotal)
    // Credit: Logistics Revenue (logisticsCost) [if any]
    // Credit: Labor Revenue (laborCost) [if any]
    // Credit: Additional Revenue (additionalCharges) [if any]
    const entries: any[] = [];

    // Debit AR
    entries.push({
        id: uuid(),
        journalId,
        accountCode: "1100_ACCOUNTS_RECEIVABLE",
        accountName: "Accounts Receivable — Customers",
        debit: inv.totalAmount,
        credit: 0,
        memo: `Receivable for ${inv.invoiceNumber}`,
        createdAt: new Date(),
    });

    // Debit Discount if any
    if (inv.discount > 0) {
        entries.push({
            id: uuid(),
            journalId,
            accountCode: "4300_DISCOUNTS_ALLOWED",
            accountName: "Discounts & Commercial Deductions",
            debit: inv.discount,
            credit: 0,
            memo: `Discount applied on ${inv.invoiceNumber}`,
            createdAt: new Date(),
        });
    }

    // Credit Rental Revenue / Subtotal
    if (inv.subtotal > 0) {
        entries.push({
            id: uuid(),
            journalId,
            accountCode: "4100_RENTAL_REVENUE_PLATFORM",
            accountName: "Rental Equipment Gross Revenue",
            debit: 0,
            credit: inv.subtotal,
            memo: `Gross equipment rental for ${inv.invoiceNumber}`,
            createdAt: new Date(),
        });
    }

    // Credit Logistics if any
    if (inv.logisticsCost > 0) {
        entries.push({
            id: uuid(),
            journalId,
            accountCode: "5100_LOGISTICS_REVENUE",
            accountName: "Logistics & Transport Revenue",
            debit: 0,
            credit: inv.logisticsCost,
            memo: `Logistics charge for ${inv.invoiceNumber}`,
            createdAt: new Date(),
        });
    }

    // Credit Labor if any
    if (inv.laborCost > 0) {
        entries.push({
            id: uuid(),
            journalId,
            accountCode: "5200_LABOR_REVENUE",
            accountName: "Technical Labor & Rigging Revenue",
            debit: 0,
            credit: inv.laborCost,
            memo: `Labor charge for ${inv.invoiceNumber}`,
            createdAt: new Date(),
        });
    }

    // Credit Additional Charges if any
    if (inv.additionalCharges > 0) {
        entries.push({
            id: uuid(),
            journalId,
            accountCode: "5300_PERMITS_ADDITIONAL_REVENUE",
            accountName: "Permits & Custom Service Revenue",
            debit: 0,
            credit: inv.additionalCharges,
            memo: `Additional charges for ${inv.invoiceNumber}`,
            createdAt: new Date(),
        });
    }

    // Verify Sum(Debit) === Sum(Credit)
    const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Double-entry balance mismatch! Debit: ${totalDebit}, Credit: ${totalCredit}`);
    }

    await db.insert(journalEntries).values(entries);

    return { success: true, invoiceNumber: inv.invoiceNumber, journalNumber };
}

/**
 * Record a client payment against an invoice
 */
export async function recordClientPayment(params: {
    invoiceId: string;
    amount: number;
    paymentMethod: "bank_transfer" | "credit_card" | "cheque" | "cash";
    transactionRef?: string;
    paymentProofUrl?: string;
    notes?: string;
    userId?: string;
}) {
    const { invoiceId, amount, paymentMethod, transactionRef, paymentProofUrl, notes, userId } = params;

    const inv = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId)
    });

    if (!inv) throw new Error("Invoice not found");
    if (amount <= 0) throw new Error("Payment amount must be greater than zero");

    const paymentId = uuid();
    const paymentNumber = await generateSequentialNumber("PAY", "client_payments");

    await db.insert(clientPayments).values({
        id: paymentId,
        paymentNumber,
        invoiceId,
        bookingId: inv.bookingId,
        projectId: inv.projectId,
        userId: userId || inv.userId,
        amount,
        currency: "QAR",
        paymentMethod,
        transactionRef,
        paymentProofUrl,
        status: "pending_verification",
        notes,
        paymentDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    return { paymentId, paymentNumber };
}

/**
 * Admin verifies client payment: Allocates to invoice and posts double-entry cash receipt
 */
export async function verifyClientPayment(paymentId: string, verifiedByUserId: string) {
    const payment = await db.query.clientPayments.findFirst({
        where: eq(clientPayments.id, paymentId),
        with: { invoice: true }
    });

    if (!payment) throw new Error("Payment record not found");
    if (payment.status === "verified") throw new Error("Payment is already verified");

    const inv = payment.invoice;
    if (!inv) throw new Error("Associated invoice not found");

    const newAmountPaid = Math.round(((inv.amountPaid || 0) + payment.amount) * 100) / 100;
    const newAmountDue = Math.max(0, Math.round((inv.totalAmount - newAmountPaid) * 100) / 100);
    const newStatus = newAmountDue <= 0 ? "paid" : "partially_paid";

    // Update payment
    await db.update(clientPayments)
        .set({
            status: "verified",
            verifiedBy: verifiedByUserId,
            verifiedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(clientPayments.id, paymentId));

    // Update invoice
    await db.update(invoices)
        .set({
            amountPaid: newAmountPaid,
            amountDue: newAmountDue,
            status: newStatus,
            updatedAt: new Date(),
        })
        .where(eq(invoices.id, inv.id));

    // Update parent booking paymentStatus if fully settled
    if (inv.bookingId) {
        await db.update(bookings)
            .set({
                paymentStatus: newStatus === "paid" ? "paid" : "partially_paid",
                updatedAt: new Date(),
            })
            .where(eq(bookings.id, inv.bookingId));
    }

    // Post Double-Entry Cash Receipt Journal
    const journalId = uuid();
    const journalNumber = await generateSequentialNumber("JRN", "financial_journals");

    await db.insert(financialJournals).values({
        id: journalId,
        journalNumber,
        referenceType: "payment",
        referenceId: payment.id,
        description: `Payment ${payment.paymentNumber} of QAR ${payment.amount} for Invoice ${inv.invoiceNumber}`,
        isReversed: false,
        postedAt: new Date(),
        createdAt: new Date(),
    });

    const entries = [
        // Debit: Cash/Bank
        {
            id: uuid(),
            journalId,
            accountCode: "1200_CASH_BANK",
            accountName: "QNB Corporate Operations Account",
            debit: payment.amount,
            credit: 0,
            memo: `Cash received for ${inv.invoiceNumber} (Ref: ${payment.transactionRef || "N/A"})`,
            createdAt: new Date(),
        },
        // Credit: Accounts Receivable
        {
            id: uuid(),
            journalId,
            accountCode: "1100_ACCOUNTS_RECEIVABLE",
            accountName: "Accounts Receivable — Customers",
            debit: 0,
            credit: payment.amount,
            memo: `Settlement of ${inv.invoiceNumber}`,
            createdAt: new Date(),
        }
    ];

    await db.insert(journalEntries).values(entries);

    return { success: true, paymentNumber: payment.paymentNumber, invoiceStatus: newStatus, amountDue: newAmountDue };
}

/**
 * Issue a Credit Note against an invoice
 */
export async function createCreditNote(params: {
    invoiceId: string;
    amount: number;
    reason: string;
    issuedByUserId: string;
    notes?: string;
}) {
    const { invoiceId, amount, reason, issuedByUserId, notes } = params;

    const inv = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId)
    });

    if (!inv) throw new Error("Invoice not found");
    if (amount <= 0 || amount > inv.totalAmount) {
        throw new Error(`Credit amount must be between 0 and invoice total (${inv.totalAmount})`);
    }

    const creditNoteId = uuid();
    const creditNoteNumber = await generateSequentialNumber("CN", "credit_notes");

    await db.insert(creditNotes).values({
        id: creditNoteId,
        creditNoteNumber,
        invoiceId,
        bookingId: inv.bookingId,
        userId: inv.userId,
        amount,
        currency: "QAR",
        reason,
        status: "issued",
        issuedBy: issuedByUserId,
        issuedAt: new Date(),
        notes,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    // Reduce invoice due amount
    const newTotalAmount = Math.max(0, inv.totalAmount - amount);
    const newAmountDue = Math.max(0, inv.amountDue - amount);
    const newStatus = newAmountDue <= 0 && inv.amountPaid >= newTotalAmount ? "paid" : "credited";

    await db.update(invoices)
        .set({
            totalAmount: newTotalAmount,
            amountDue: newAmountDue,
            status: newStatus,
            updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));

    // Post Double-Entry Journal for Credit Note
    const journalId = uuid();
    const journalNumber = await generateSequentialNumber("JRN", "financial_journals");

    await db.insert(financialJournals).values({
        id: journalId,
        journalNumber,
        referenceType: "credit_note",
        referenceId: creditNoteId,
        description: `Credit Note ${creditNoteNumber} for Invoice ${inv.invoiceNumber}: ${reason}`,
        isReversed: false,
        postedAt: new Date(),
        createdAt: new Date(),
    });

    const entries = [
        // Debit: Revenue Adjustment
        {
            id: uuid(),
            journalId,
            accountCode: "4100_RENTAL_REVENUE_PLATFORM",
            accountName: "Rental Equipment Gross Revenue",
            debit: amount,
            credit: 0,
            memo: `Credit Note allowance for ${inv.invoiceNumber}`,
            createdAt: new Date(),
        },
        // Credit: Accounts Receivable
        {
            id: uuid(),
            journalId,
            accountCode: "1100_ACCOUNTS_RECEIVABLE",
            accountName: "Accounts Receivable — Customers",
            debit: 0,
            credit: amount,
            memo: `Credit applied to ${inv.invoiceNumber}`,
            createdAt: new Date(),
        }
    ];

    await db.insert(journalEntries).values(entries);

    return { creditNoteId, creditNoteNumber, newAmountDue };
}

/**
 * Process a Client Refund
 */
export async function processRefund(params: {
    creditNoteId?: string;
    paymentId?: string;
    amount: number;
    reason: string;
    processedByUserId: string;
    refundMethod?: "bank_transfer" | "credit_card" | "cheque" | "cash";
    transactionRef?: string;
    notes?: string;
}) {
    const { 
        creditNoteId, 
        paymentId, 
        amount, 
        reason, 
        processedByUserId, 
        refundMethod = "bank_transfer",
        transactionRef,
        notes 
    } = params;

    if (amount <= 0) throw new Error("Refund amount must be greater than zero");

    const refundId = uuid();
    const refundNumber = await generateSequentialNumber("REF", "refunds");

    await db.insert(refunds).values({
        id: refundId,
        refundNumber,
        creditNoteId: creditNoteId || null,
        paymentId: paymentId || null,
        amount,
        currency: "QAR",
        refundMethod,
        transactionRef,
        reason,
        status: "processed",
        processedBy: processedByUserId,
        processedAt: new Date(),
        notes,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    if (creditNoteId) {
        await db.update(creditNotes)
            .set({ status: "refunded", updatedAt: new Date() })
            .where(eq(creditNotes.id, creditNoteId));
    }

    // Post Double-Entry Journal for Refund
    const journalId = uuid();
    const journalNumber = await generateSequentialNumber("JRN", "financial_journals");

    await db.insert(financialJournals).values({
        id: journalId,
        journalNumber,
        referenceType: "refund",
        referenceId: refundId,
        description: `Refund ${refundNumber} of QAR ${amount}: ${reason}`,
        isReversed: false,
        postedAt: new Date(),
        createdAt: new Date(),
    });

    const entries = [
        // Debit: Accounts Receivable (or Refund Suspense)
        {
            id: uuid(),
            journalId,
            accountCode: "1100_ACCOUNTS_RECEIVABLE",
            accountName: "Accounts Receivable — Customers",
            debit: amount,
            credit: 0,
            memo: `Refund reversal for ${reason}`,
            createdAt: new Date(),
        },
        // Credit: Cash/Bank
        {
            id: uuid(),
            journalId,
            accountCode: "1200_CASH_BANK",
            accountName: "QNB Corporate Operations Account",
            debit: 0,
            credit: amount,
            memo: `Disbursement for ${refundNumber}`,
            createdAt: new Date(),
        }
    ];

    await db.insert(journalEntries).values(entries);

    return { refundId, refundNumber };
}

/**
 * Calculate real-time Accounts Receivable Aging Buckets
 */
export async function getReceivablesAging() {
    const allInvoices = await db.query.invoices.findMany({
        where: sql`${invoices.status} IN ('issued', 'partially_paid', 'credited') AND ${invoices.amountDue} > 0`,
        orderBy: [desc(invoices.dueDate)],
    });

    const now = new Date().getTime();

    const aging = {
        current: { count: 0, amount: 0, invoices: [] as any[] }, // Due in future or <= 30 days
        days31_60: { count: 0, amount: 0, invoices: [] as any[] },
        days61_90: { count: 0, amount: 0, invoices: [] as any[] },
        overdue90Plus: { count: 0, amount: 0, invoices: [] as any[] },
        totalReceivable: 0,
    };

    for (const inv of allInvoices) {
        const dueTime = new Date(inv.dueDate).getTime();
        const daysOverdue = Math.floor((now - dueTime) / 86400000);

        aging.totalReceivable += inv.amountDue;

        if (daysOverdue <= 30) {
            aging.current.count++;
            aging.current.amount += inv.amountDue;
            aging.current.invoices.push(inv);
        } else if (daysOverdue <= 60) {
            aging.days31_60.count++;
            aging.days31_60.amount += inv.amountDue;
            aging.days31_60.invoices.push(inv);
        } else if (daysOverdue <= 90) {
            aging.days61_90.count++;
            aging.days61_90.amount += inv.amountDue;
            aging.days61_90.invoices.push(inv);
        } else {
            aging.overdue90Plus.count++;
            aging.overdue90Plus.amount += inv.amountDue;
            aging.overdue90Plus.invoices.push(inv);
        }
    }

    return aging;
}

/**
 * System-Wide Comprehensive Financial Reconciliation
 */
export async function getFinancialReconciliation() {
    const allInvoices = await db.query.invoices.findMany();
    const allPayments = await db.query.clientPayments.findMany({ where: eq(clientPayments.status, "verified") });
    const allCreditNotes = await db.query.creditNotes.findMany({ where: eq(creditNotes.status, "issued") });
    const allRefunds = await db.query.refunds.findMany({ where: eq(refunds.status, "processed") });
    const allVendorLedgers = await db.query.vendorLedgers.findMany();
    const allJournals = await db.query.financialJournals.findMany({ with: { entries: true } });

    const totalInvoiced = allInvoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const totalCollected = allPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalCredited = allCreditNotes.reduce((s, c) => s + (c.amount || 0), 0);
    const totalRefunded = allRefunds.reduce((s, r) => s + (r.amount || 0), 0);
    const totalOutstandingReceivables = allInvoices.reduce((s, i) => s + (i.amountDue || 0), 0);

    const totalVendorGross = allVendorLedgers.reduce((s, l) => s + (l.amount || 0), 0);
    const totalPlatformCommissions = allVendorLedgers.reduce((s, l) => s + (l.platformFee || 0), 0);
    const totalVendorPayables = allVendorLedgers.reduce((s, l) => s + (l.vendorPayout || 0), 0);

    let journalDebits = 0;
    let journalCredits = 0;
    for (const j of allJournals) {
        for (const e of j.entries) {
            journalDebits += (e.debit || 0);
            journalCredits += (e.credit || 0);
        }
    }

    const isDoubleEntryBalanced = Math.abs(journalDebits - journalCredits) < 0.01;

    return {
        invoicing: {
            totalInvoiced,
            totalCollected,
            totalCredited,
            totalRefunded,
            totalOutstandingReceivables,
        },
        vendorEconomics: {
            totalVendorGross,
            totalPlatformCommissions,
            totalVendorPayables,
        },
        generalLedger: {
            journalDebits,
            journalCredits,
            isDoubleEntryBalanced,
            totalJournals: allJournals.length,
        }
    };
}

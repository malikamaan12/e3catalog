import { db, pool } from "./db";
import { 
    invoices, 
    invoiceItems, 
    clientPayments, 
    paymentAllocations,
    creditNotes, 
    refunds, 
    vendorPayouts,
    vendorRemittances,
    financialJournals, 
    journalEntries,
    bookings,
    vendorLedgers
} from "./db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export type DocumentType = 
    | "invoice" 
    | "payment" 
    | "allocation"
    | "credit_note" 
    | "refund" 
    | "journal" 
    | "payout" 
    | "remittance";

/**
 * Concurrency-safe sequential number generator using atomic row-locked UPSERT
 */
export async function generateSequentialNumber(
    documentType: DocumentType
): Promise<string> {
    const year = new Date().getFullYear();
    const prefixMap: Record<DocumentType, string> = {
        invoice: "INV",
        payment: "PAY",
        allocation: "ALC",
        credit_note: "CN",
        refund: "REF",
        journal: "JRN",
        payout: "PO",
        remittance: "REM",
    };
    const prefix = prefixMap[documentType] || "DOC";

    const res = await db.execute(sql`
        INSERT INTO "document_sequences" ("document_type", "year", "current_value", "updated_at")
        VALUES (${documentType}, ${year}, 1, NOW())
        ON CONFLICT ("document_type", "year")
        DO UPDATE SET "current_value" = "document_sequences"."current_value" + 1, "updated_at" = NOW()
        RETURNING "current_value";
    `);

    const nextVal = (res.rows[0]?.current_value as number) || 1;
    return `${prefix}-${year}-${String(nextVal).padStart(4, "0")}`;
}

/**
 * Recalculate invoice derived financial balances (amountPaid, amountDue, status)
 * PRESERVES original invoice.totalAmount strictly immutable!
 */
export async function deriveInvoiceFinancials(invoiceId: string) {
    const inv = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId)
    });

    if (!inv) throw new Error(`Invoice not found for ID: ${invoiceId}`);

    // 1. Sum all active payment allocations
    const activeAllocations = await db.query.paymentAllocations.findMany({
        where: and(
            eq(paymentAllocations.invoiceId, invoiceId),
            eq(paymentAllocations.status, "active")
        )
    });
    const totalAllocated = activeAllocations.reduce((sum, a) => sum + a.amount, 0);

    // 2. Sum all issued credit notes
    const activeCreditNotes = await db.query.creditNotes.findMany({
        where: and(
            eq(creditNotes.invoiceId, invoiceId),
            eq(creditNotes.status, "issued")
        )
    });
    const totalCredits = activeCreditNotes.reduce((sum, c) => sum + c.amount, 0);

    // 3. Compute new amountPaid and amountDue
    const newAmountPaid = Math.round(totalAllocated * 100) / 100;
    const newAmountDue = Math.max(0, Math.round((inv.totalAmount - newAmountPaid - totalCredits) * 100) / 100);

    let newStatus = inv.status;
    if (inv.status !== "draft" && inv.status !== "cancelled") {
        if (newAmountDue <= 0) {
            newStatus = "paid";
        } else if (newAmountPaid > 0) {
            newStatus = "partially_paid";
        } else if (totalCredits > 0) {
            newStatus = "credited";
        } else {
            newStatus = "issued";
        }
    }

    // Update ONLY derived fields; totalAmount, subtotal, discount remain untouched
    await db.update(invoices)
        .set({
            amountPaid: newAmountPaid,
            amountDue: newAmountDue,
            status: newStatus,
            updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));

    return {
        totalAmount: inv.totalAmount, // Immutable original
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        totalCredits,
        status: newStatus
    };
}

/**
 * Create a customer invoice from a confirmed booking or project proposal
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
    const invoiceNumber = await generateSequentialNumber("invoice");
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
 * Issue an invoice: Locks as immutable legal document and posts balanced double-entry GL journal
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

    // Post Balanced Double-Entry General Ledger Journal
    const journalId = uuid();
    const journalNumber = await generateSequentialNumber("journal");

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

    // Check if line items belong to vendors to correctly credit Vendor Payables vs E3 Revenue
    const entries: any[] = [];

    // Debit: Accounts Receivable (totalAmount)
    entries.push({
        id: uuid(),
        journalId,
        accountCode: "1100_ACCOUNTS_RECEIVABLE",
        accountName: "Accounts Receivable — Customers",
        debit: inv.totalAmount,
        credit: 0,
        memo: `Receivable for Invoice ${inv.invoiceNumber}`,
        createdAt: new Date(),
    });

    // Debit: Discounts Allowed (discount, if any)
    if (inv.discount > 0) {
        entries.push({
            id: uuid(),
            journalId,
            accountCode: "4300_DISCOUNTS_ALLOWED",
            accountName: "Commercial Client Discounts",
            debit: inv.discount,
            credit: 0,
            memo: `Discount concession on ${inv.invoiceNumber}`,
            createdAt: new Date(),
        });
    }

    // Credit: Rental Revenue (subtotal)
    if (inv.subtotal > 0) {
        entries.push({
            id: uuid(),
            journalId,
            accountCode: "4100_RENTAL_REVENUE_PLATFORM",
            accountName: "Equipment Rental Revenue",
            debit: 0,
            credit: inv.subtotal,
            memo: `Gross equipment rental for ${inv.invoiceNumber}`,
            createdAt: new Date(),
        });
    }

    // Credit: Logistics Revenue
    if (inv.logisticsCost > 0) {
        entries.push({
            id: uuid(),
            journalId,
            accountCode: "5100_LOGISTICS_REVENUE",
            accountName: "Logistics & Freight Revenue",
            debit: 0,
            credit: inv.logisticsCost,
            memo: `Transport and heavy freight for ${inv.invoiceNumber}`,
            createdAt: new Date(),
        });
    }

    // Credit: Labor Revenue
    if (inv.laborCost > 0) {
        entries.push({
            id: uuid(),
            journalId,
            accountCode: "5200_LABOR_REVENUE",
            accountName: "Technical Crew & Rigging Labor",
            debit: 0,
            credit: inv.laborCost,
            memo: `Crew and rigging labor for ${inv.invoiceNumber}`,
            createdAt: new Date(),
        });
    }

    // Credit: Permits / Additional Charges
    if (inv.additionalCharges > 0) {
        entries.push({
            id: uuid(),
            journalId,
            accountCode: "5300_PERMITS_ADDITIONAL_REVENUE",
            accountName: "Permits & Custom Event Staging Revenue",
            debit: 0,
            credit: inv.additionalCharges,
            memo: `Municipal staging permits for ${inv.invoiceNumber}`,
            createdAt: new Date(),
        });
    }

    // Verify Debit === Credit
    const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Double-entry balance mismatch! Debit: ${totalDebit}, Credit: ${totalCredit}`);
    }

    await db.insert(journalEntries).values(entries);

    return { success: true, invoiceNumber: inv.invoiceNumber, journalNumber };
}

/**
 * Record a Client Payment submission (Initial status: pending_verification)
 */
export async function recordClientPayment(params: {
    invoiceId?: string;
    amount: number;
    paymentMethod: "bank_transfer" | "credit_card" | "cheque" | "cash";
    transactionRef?: string;
    paymentProofUrl?: string;
    notes?: string;
    userId?: string;
}) {
    const { invoiceId, amount, paymentMethod, transactionRef, paymentProofUrl, notes, userId } = params;

    if (amount <= 0) throw new Error("Payment amount must be greater than zero");

    let bookingId: string | null = null;
    let projectId: string | null = null;

    if (invoiceId) {
        const inv = await db.query.invoices.findFirst({
            where: eq(invoices.id, invoiceId)
        });
        if (inv) {
            bookingId = inv.bookingId || null;
            projectId = inv.projectId || null;
        }
    }

    const paymentId = uuid();
    const paymentNumber = await generateSequentialNumber("payment");

    await db.insert(clientPayments).values({
        id: paymentId,
        paymentNumber,
        invoiceId: invoiceId || null,
        bookingId,
        projectId,
        userId: userId || null,
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
 * Independent Admin Payment Verification:
 * Validates bank proof and posts Cash Receipt General Ledger Journal
 */
export async function verifyClientPayment(
    paymentId: string, 
    verifiedByUserId: string,
    options?: { autoAllocateToInvoiceId?: string }
) {
    const payment = await db.query.clientPayments.findFirst({
        where: eq(clientPayments.id, paymentId)
    });

    if (!payment) throw new Error("Payment record not found");
    if (payment.status === "verified") throw new Error("Payment is already verified");

    // 1. Mark payment as verified
    await db.update(clientPayments)
        .set({
            status: "verified",
            verifiedBy: verifiedByUserId,
            verifiedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(clientPayments.id, paymentId));

    // 2. Post Cash Receipt General Ledger Journal
    const journalId = uuid();
    const journalNumber = await generateSequentialNumber("journal");

    await db.insert(financialJournals).values({
        id: journalId,
        journalNumber,
        referenceType: "payment",
        referenceId: payment.id,
        description: `Client Remittance ${payment.paymentNumber} of QAR ${payment.amount} (Ref: ${payment.transactionRef || "N/A"})`,
        isReversed: false,
        postedAt: new Date(),
        createdAt: new Date(),
    });

    const entries = [
        {
            id: uuid(),
            journalId,
            accountCode: "1200_CASH_BANK",
            accountName: "Operating Cash & Bank Account",
            debit: payment.amount,
            credit: 0,
            memo: `Cash remittance received (Ref: ${payment.transactionRef || "N/A"})`,
            createdAt: new Date(),
        },
        {
            id: uuid(),
            journalId,
            accountCode: "1100_ACCOUNTS_RECEIVABLE",
            accountName: "Accounts Receivable — Customers",
            debit: 0,
            credit: payment.amount,
            memo: `Cash collection for ${payment.paymentNumber}`,
            createdAt: new Date(),
        }
    ];

    await db.insert(journalEntries).values(entries);

    // 3. Auto-allocate if requested or if attached to a specific invoice
    const targetInvoiceId = options?.autoAllocateToInvoiceId || payment.invoiceId;
    let allocationResult = null;

    if (targetInvoiceId) {
        const inv = await db.query.invoices.findFirst({
            where: eq(invoices.id, targetInvoiceId)
        });
        if (inv && inv.amountDue > 0) {
            const allocAmount = Math.min(payment.amount, inv.amountDue);
            allocationResult = await allocatePayment({
                paymentId,
                invoiceId: targetInvoiceId,
                amount: allocAmount,
                allocatedBy: verifiedByUserId,
                notes: `Auto-allocated on payment verification (${payment.paymentNumber})`
            });
        }
    }

    return {
        success: true,
        paymentNumber: payment.paymentNumber,
        journalNumber,
        allocationResult
    };
}

/**
 * Allocate verified client payment to one or more customer invoices
 * Concurrency-safe with row locking and balance overflow prevention
 */
export async function allocatePayment(params: {
    paymentId: string;
    invoiceId: string;
    amount: number;
    allocatedBy: string;
    notes?: string;
}) {
    const { paymentId, invoiceId, amount, allocatedBy, notes } = params;

    if (amount <= 0) throw new Error("Allocation amount must be greater than zero");

    const client = await pool.connect();
    try {
        await client.query("BEGIN;");

        // Lock payment row
        const payRes = await client.query(`
            SELECT * FROM "client_payments" WHERE "id" = $1 FOR UPDATE;
        `, [paymentId]);

        if (payRes.rows.length === 0) throw new Error("Payment record not found");
        const payment = payRes.rows[0];

        if (payment.status !== "verified") {
            throw new Error(`Only verified payments can be allocated. Current status: ${payment.status}`);
        }

        // Sum existing active allocations for this payment
        const allocRes = await client.query(`
            SELECT COALESCE(SUM(amount), 0) AS total_allocated 
            FROM "payment_allocations" 
            WHERE "payment_id" = $1 AND "status" = 'active';
        `, [paymentId]);

        const existingAllocated = parseFloat(allocRes.rows[0].total_allocated || "0");
        const remainingCredit = payment.amount - existingAllocated;

        if (amount > remainingCredit + 0.001) {
            throw new Error(`Allocation of QAR ${amount} exceeds unallocated payment balance of QAR ${remainingCredit}`);
        }

        // Lock invoice row
        const invRes = await client.query(`
            SELECT * FROM "invoices" WHERE "id" = $1 FOR UPDATE;
        `, [invoiceId]);

        if (invRes.rows.length === 0) throw new Error("Invoice record not found");
        const inv = invRes.rows[0];

        if (inv.status === "draft" || inv.status === "cancelled") {
            throw new Error(`Cannot allocate payment to invoice in status: ${inv.status}`);
        }

        if (amount > inv.amount_due + 0.001) {
            throw new Error(`Allocation of QAR ${amount} exceeds invoice amount due of QAR ${inv.amount_due}`);
        }

        // Insert payment allocation
        const allocationId = uuid();
        await client.query(`
            INSERT INTO "payment_allocations" 
            ("id", "payment_id", "invoice_id", "amount", "status", "allocated_at", "allocated_by", "notes")
            VALUES ($1, $2, $3, $4, 'active', NOW(), $5, $6);
        `, [allocationId, paymentId, invoiceId, amount, allocatedBy, notes || null]);

        await client.query("COMMIT;");

        // Update derived financials on invoice
        const derived = await deriveInvoiceFinancials(invoiceId);

        return {
            allocationId,
            allocatedAmount: amount,
            remainingPaymentCredit: remainingCredit - amount,
            invoiceAmountDue: derived.amountDue,
            invoiceStatus: derived.status
        };
    } catch (err) {
        await client.query("ROLLBACK;");
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Reverse a payment allocation
 */
export async function reverseAllocation(params: {
    allocationId: string;
    reversedByUserId: string;
    reason: string;
}) {
    const { allocationId, reversedByUserId, reason } = params;

    const alloc = await db.query.paymentAllocations.findFirst({
        where: eq(paymentAllocations.id, allocationId)
    });

    if (!alloc) throw new Error("Allocation record not found");
    if (alloc.status === "reversed") throw new Error("Allocation is already reversed");

    await db.update(paymentAllocations)
        .set({
            status: "reversed",
            reversedAt: new Date(),
            reversedBy: reversedByUserId,
            notes: `${alloc.notes || ""} [Reversed: ${reason}]`,
        })
        .where(eq(paymentAllocations.id, allocationId));

    // Recalculate invoice balances
    const derived = await deriveInvoiceFinancials(alloc.invoiceId);

    return {
        success: true,
        allocationId,
        invoiceAmountDue: derived.amountDue,
        invoiceStatus: derived.status
    };
}

/**
 * Issue an immutable Credit Note against an invoice
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
    const creditNoteNumber = await generateSequentialNumber("credit_note");

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

    // Update derived invoice balances (totalAmount remains strictly unchanged)
    const derived = await deriveInvoiceFinancials(invoiceId);

    // Post Double-Entry Journal for Credit Note
    const journalId = uuid();
    const journalNumber = await generateSequentialNumber("journal");

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
        {
            id: uuid(),
            journalId,
            accountCode: "4100_RENTAL_REVENUE_PLATFORM",
            accountName: "Equipment Rental Revenue",
            debit: amount,
            credit: 0,
            memo: `Credit Note allowance for ${inv.invoiceNumber}`,
            createdAt: new Date(),
        },
        {
            id: uuid(),
            journalId,
            accountCode: "1100_ACCOUNTS_RECEIVABLE",
            accountName: "Accounts Receivable — Customers",
            debit: 0,
            credit: amount,
            memo: `Credit adjustment applied on ${inv.invoiceNumber}`,
            createdAt: new Date(),
        }
    ];

    await db.insert(journalEntries).values(entries);

    return { creditNoteId, creditNoteNumber, newAmountDue: derived.amountDue };
}

/**
 * Process a Client Refund (Cash Disbursement)
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
    const refundNumber = await generateSequentialNumber("refund");

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

    // Post Double-Entry General Ledger Journal for Refund Disbursement
    const journalId = uuid();
    const journalNumber = await generateSequentialNumber("journal");

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
        {
            id: uuid(),
            journalId,
            accountCode: "1200_CASH_BANK",
            accountName: "Operating Cash & Bank Account",
            debit: 0,
            credit: amount,
            memo: `Cash refund disbursement for ${refundNumber}`,
            createdAt: new Date(),
        }
    ];

    await db.insert(journalEntries).values(entries);

    return { refundId, refundNumber };
}

/**
 * Record an E3-to-Vendor Payout Disbursement
 * (E3 pays vendor their net equipment rental entitlement)
 */
export async function recordVendorPayout(params: {
    vendorId: string;
    ledgerId: string;
    amount: number;
    payoutMethod?: "bank_transfer" | "cheque" | "wire";
    transactionRef?: string;
    payoutProofUrl?: string;
    processedBy: string;
    notes?: string;
}) {
    const { 
        vendorId, 
        ledgerId, 
        amount, 
        payoutMethod = "bank_transfer", 
        transactionRef, 
        payoutProofUrl, 
        processedBy, 
        notes 
    } = params;

    const ledger = await db.query.vendorLedgers.findFirst({
        where: eq(vendorLedgers.id, ledgerId)
    });

    if (!ledger) throw new Error("Vendor ledger record not found");
    if (amount <= 0) throw new Error("Payout amount must be greater than zero");

    const payoutId = uuid();
    const payoutNumber = await generateSequentialNumber("payout");

    await db.insert(vendorPayouts).values({
        id: payoutId,
        payoutNumber,
        vendorId,
        ledgerId,
        amount,
        currency: "QAR",
        payoutMethod,
        transactionRef,
        payoutProofUrl,
        status: "approved_paid",
        processedBy,
        processedAt: new Date(),
        notes,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    // Mark vendor ledger as paid
    await db.update(vendorLedgers)
        .set({
            status: "paid",
            notes: `Paid via ${payoutNumber} (Ref: ${transactionRef || "N/A"})`,
            updatedAt: new Date(),
        })
        .where(eq(vendorLedgers.id, ledgerId));

    // Post Double-Entry General Ledger Journal for Vendor Payout
    const journalId = uuid();
    const journalNumber = await generateSequentialNumber("journal");

    await db.insert(financialJournals).values({
        id: journalId,
        journalNumber,
        referenceType: "payout",
        referenceId: payoutId,
        description: `E3-to-Vendor Payout ${payoutNumber} of QAR ${amount} to Vendor (Ledger ${ledger.id})`,
        isReversed: false,
        postedAt: new Date(),
        createdAt: new Date(),
    });

    const entries = [
        {
            id: uuid(),
            journalId,
            accountCode: "2100_ACCOUNTS_PAYABLE_VENDORS",
            accountName: "Vendor Equipment Payables",
            debit: amount,
            credit: 0,
            memo: `Discharge of vendor payable for Ledger ${ledger.id}`,
            createdAt: new Date(),
        },
        {
            id: uuid(),
            journalId,
            accountCode: "1200_CASH_BANK",
            accountName: "Operating Cash & Bank Account",
            debit: 0,
            credit: amount,
            memo: `Cash wire disbursement for ${payoutNumber}`,
            createdAt: new Date(),
        }
    ];

    await db.insert(journalEntries).values(entries);

    return { payoutId, payoutNumber, journalNumber };
}

/**
 * Record a Vendor-to-E3 Remittance (when vendor directly collects cash from client)
 */
export async function recordVendorRemittance(params: {
    vendorId: string;
    bookingId: string;
    amountCollected: number;
    platformCommissionOwed: number;
    remittanceEvidenceUrl?: string;
    notes?: string;
}) {
    const { vendorId, bookingId, amountCollected, platformCommissionOwed, remittanceEvidenceUrl, notes } = params;

    const remittanceId = uuid();
    const remittanceNumber = await generateSequentialNumber("remittance");

    await db.insert(vendorRemittances).values({
        id: remittanceId,
        remittanceNumber,
        vendorId,
        bookingId,
        amountCollected,
        platformCommissionOwed,
        remittanceEvidenceUrl,
        status: "submitted_for_review",
        notes,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    return { remittanceId, remittanceNumber };
}

/**
 * Verify Vendor Remittance received by E3
 */
export async function verifyVendorRemittance(remittanceId: string, verifiedByUserId: string) {
    const rem = await db.query.vendorRemittances.findFirst({
        where: eq(vendorRemittances.id, remittanceId)
    });

    if (!rem) throw new Error("Remittance record not found");
    if (rem.status === "approved_verified") throw new Error("Remittance is already verified");

    await db.update(vendorRemittances)
        .set({
            status: "approved_verified",
            verifiedBy: verifiedByUserId,
            verifiedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(vendorRemittances.id, remittanceId));

    // Post Commission Collection Journal
    const journalId = uuid();
    const journalNumber = await generateSequentialNumber("journal");

    await db.insert(financialJournals).values({
        id: journalId,
        journalNumber,
        referenceType: "remittance",
        referenceId: rem.id,
        description: `Vendor Commission Remittance ${rem.remittanceNumber} received: QAR ${rem.platformCommissionOwed}`,
        isReversed: false,
        postedAt: new Date(),
        createdAt: new Date(),
    });

    const entries = [
        {
            id: uuid(),
            journalId,
            accountCode: "1200_CASH_BANK",
            accountName: "Operating Cash & Bank Account",
            debit: rem.platformCommissionOwed,
            credit: 0,
            memo: `Commission remittance received (${rem.remittanceNumber})`,
            createdAt: new Date(),
        },
        {
            id: uuid(),
            journalId,
            accountCode: "4200_COMMISSION_REVENUE",
            accountName: "Marketplace Commission Revenue",
            debit: 0,
            credit: rem.platformCommissionOwed,
            memo: `Commission earned on booking ${rem.bookingId}`,
            createdAt: new Date(),
        }
    ];

    await db.insert(journalEntries).values(entries);

    return { success: true, remittanceNumber: rem.remittanceNumber, journalNumber };
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
        current: { count: 0, amount: 0, invoices: [] as any[] },
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
    const allAllocations = await db.query.paymentAllocations.findMany({ where: eq(paymentAllocations.status, "active") });
    const allCreditNotes = await db.query.creditNotes.findMany({ where: eq(creditNotes.status, "issued") });
    const allRefunds = await db.query.refunds.findMany({ where: eq(refunds.status, "processed") });
    const allVendorLedgers = await db.query.vendorLedgers.findMany();
    const allPayouts = await db.query.vendorPayouts.findMany({ where: eq(vendorPayouts.status, "approved_paid") });
    const allJournals = await db.query.financialJournals.findMany({ with: { entries: true } });

    const totalInvoiced = allInvoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const totalCollected = allPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalAllocated = allAllocations.reduce((s, a) => s + (a.amount || 0), 0);
    const totalCredited = allCreditNotes.reduce((s, c) => s + (c.amount || 0), 0);
    const totalRefunded = allRefunds.reduce((s, r) => s + (r.amount || 0), 0);
    const totalOutstandingReceivables = allInvoices.reduce((s, i) => s + (i.amountDue || 0), 0);

    const totalVendorGross = allVendorLedgers.reduce((s, l) => s + (l.amount || 0), 0);
    const totalPlatformCommissions = allVendorLedgers.reduce((s, l) => s + (l.platformFee || 0), 0);
    const totalVendorPayables = allVendorLedgers.reduce((s, l) => s + (l.vendorPayout || 0), 0);
    const totalVendorPaidOut = allPayouts.reduce((s, p) => s + (p.amount || 0), 0);

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
            totalAllocated,
            totalCredited,
            totalRefunded,
            totalOutstandingReceivables,
        },
        vendorEconomics: {
            totalVendorGross,
            totalPlatformCommissions,
            totalVendorPayables,
            totalVendorPaidOut,
        },
        generalLedger: {
            journalDebits,
            journalCredits,
            isDoubleEntryBalanced,
            totalJournals: allJournals.length,
        }
    };
}

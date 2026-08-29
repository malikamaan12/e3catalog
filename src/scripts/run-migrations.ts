import { db } from "../lib/db";
import { sql } from "drizzle-orm";

async function applyDurableMigrations() {
    console.log("Applying durable migrations to database...");
    
    // Create new tables and columns if not existing
    await db.execute(sql`
        -- Invoices Table
        CREATE TABLE IF NOT EXISTS "invoices" (
            "id" varchar(255) PRIMARY KEY NOT NULL,
            "invoice_number" varchar(100) NOT NULL UNIQUE,
            "booking_id" varchar(255) REFERENCES "bookings"("id"),
            "project_id" varchar(255),
            "user_id" varchar(255) REFERENCES "users"("id"),
            "customer_name" varchar(255) NOT NULL,
            "customer_email" varchar(255),
            "customer_phone" varchar(100),
            "invoice_type" varchar(50) DEFAULT 'deposit' NOT NULL,
            "currency" varchar(10) DEFAULT 'QAR' NOT NULL,
            "subtotal" real DEFAULT 0 NOT NULL,
            "discount" real DEFAULT 0 NOT NULL,
            "logistics_cost" real DEFAULT 0 NOT NULL,
            "labor_cost" real DEFAULT 0 NOT NULL,
            "additional_charges" real DEFAULT 0 NOT NULL,
            "tax_amount" real DEFAULT 0 NOT NULL,
            "total_amount" real DEFAULT 0 NOT NULL,
            "amount_paid" real DEFAULT 0 NOT NULL,
            "amount_due" real DEFAULT 0 NOT NULL,
            "status" varchar(50) DEFAULT 'draft' NOT NULL,
            "issue_date" timestamp DEFAULT now() NOT NULL,
            "due_date" timestamp NOT NULL,
            "payment_terms" varchar(255) DEFAULT '50% Advance, 50% on Delivery',
            "notes" text,
            "pdf_url" varchar(500),
            "metadata" jsonb,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );

        -- Invoice Items Table
        CREATE TABLE IF NOT EXISTS "invoice_items" (
            "id" varchar(255) PRIMARY KEY NOT NULL,
            "invoice_id" varchar(255) NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
            "booking_id" varchar(255) REFERENCES "bookings"("id"),
            "product_id" varchar(255) REFERENCES "products"("id"),
            "description" varchar(500) NOT NULL,
            "units" integer DEFAULT 1 NOT NULL,
            "days" integer DEFAULT 1 NOT NULL,
            "unit_price" real DEFAULT 0 NOT NULL,
            "line_total" real DEFAULT 0 NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL
        );

        -- Client Payments Table
        CREATE TABLE IF NOT EXISTS "client_payments" (
            "id" varchar(255) PRIMARY KEY NOT NULL,
            "payment_number" varchar(100) NOT NULL UNIQUE,
            "invoice_id" varchar(255) REFERENCES "invoices"("id"),
            "booking_id" varchar(255) REFERENCES "bookings"("id"),
            "project_id" varchar(255),
            "user_id" varchar(255) REFERENCES "users"("id"),
            "amount" real NOT NULL,
            "currency" varchar(10) DEFAULT 'QAR' NOT NULL,
            "payment_method" varchar(50) DEFAULT 'bank_transfer' NOT NULL,
            "transaction_ref" varchar(255),
            "payment_proof_url" varchar(500),
            "status" varchar(50) DEFAULT 'pending_verification' NOT NULL,
            "verified_by" varchar(255) REFERENCES "users"("id"),
            "verified_at" timestamp,
            "rejection_reason" varchar(500),
            "notes" text,
            "payment_date" timestamp DEFAULT now() NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );

        -- Credit Notes Table
        CREATE TABLE IF NOT EXISTS "credit_notes" (
            "id" varchar(255) PRIMARY KEY NOT NULL,
            "credit_note_number" varchar(100) NOT NULL UNIQUE,
            "invoice_id" varchar(255) NOT NULL REFERENCES "invoices"("id"),
            "booking_id" varchar(255) REFERENCES "bookings"("id"),
            "user_id" varchar(255) REFERENCES "users"("id"),
            "amount" real NOT NULL,
            "currency" varchar(10) DEFAULT 'QAR' NOT NULL,
            "reason" varchar(500) NOT NULL,
            "status" varchar(50) DEFAULT 'draft' NOT NULL,
            "issued_by" varchar(255) REFERENCES "users"("id"),
            "issued_at" timestamp,
            "notes" text,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );

        -- Refunds Table
        CREATE TABLE IF NOT EXISTS "refunds" (
            "id" varchar(255) PRIMARY KEY NOT NULL,
            "refund_number" varchar(100) NOT NULL UNIQUE,
            "credit_note_id" varchar(255) REFERENCES "credit_notes"("id"),
            "payment_id" varchar(255) REFERENCES "client_payments"("id"),
            "user_id" varchar(255) REFERENCES "users"("id"),
            "amount" real NOT NULL,
            "currency" varchar(10) DEFAULT 'QAR' NOT NULL,
            "refund_method" varchar(50) DEFAULT 'bank_transfer' NOT NULL,
            "transaction_ref" varchar(255),
            "reason" varchar(500) NOT NULL,
            "status" varchar(50) DEFAULT 'pending' NOT NULL,
            "processed_by" varchar(255) REFERENCES "users"("id"),
            "processed_at" timestamp,
            "notes" text,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );

        -- Financial Journals Table
        CREATE TABLE IF NOT EXISTS "financial_journals" (
            "id" varchar(255) PRIMARY KEY NOT NULL,
            "journal_number" varchar(100) NOT NULL UNIQUE,
            "reference_type" varchar(50) NOT NULL,
            "reference_id" varchar(255) NOT NULL,
            "description" varchar(500) NOT NULL,
            "is_reversed" boolean DEFAULT false,
            "reversal_journal_id" varchar(255),
            "posted_at" timestamp DEFAULT now() NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL
        );

        -- Journal Entries Table
        CREATE TABLE IF NOT EXISTS "journal_entries" (
            "id" varchar(255) PRIMARY KEY NOT NULL,
            "journal_id" varchar(255) NOT NULL REFERENCES "financial_journals"("id") ON DELETE CASCADE,
            "account_code" varchar(100) NOT NULL,
            "account_name" varchar(255) NOT NULL,
            "debit" real DEFAULT 0 NOT NULL,
            "credit" real DEFAULT 0 NOT NULL,
            "memo" varchar(500),
            "created_at" timestamp DEFAULT now() NOT NULL
        );

        -- Performance and Integrity Indexes
        CREATE INDEX IF NOT EXISTS "invoices_invoice_number_idx" ON "invoices" ("invoice_number");
        CREATE INDEX IF NOT EXISTS "invoices_booking_id_idx" ON "invoices" ("booking_id");
        CREATE INDEX IF NOT EXISTS "invoices_project_id_idx" ON "invoices" ("project_id");
        CREATE INDEX IF NOT EXISTS "invoices_user_id_idx" ON "invoices" ("user_id");
        CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices" ("status");
        CREATE INDEX IF NOT EXISTS "invoices_due_date_idx" ON "invoices" ("due_date");

        CREATE INDEX IF NOT EXISTS "invoice_items_invoice_id_idx" ON "invoice_items" ("invoice_id");
        CREATE INDEX IF NOT EXISTS "invoice_items_product_id_idx" ON "invoice_items" ("product_id");

        CREATE INDEX IF NOT EXISTS "client_payments_payment_number_idx" ON "client_payments" ("payment_number");
        CREATE INDEX IF NOT EXISTS "client_payments_invoice_id_idx" ON "client_payments" ("invoice_id");
        CREATE INDEX IF NOT EXISTS "client_payments_project_id_idx" ON "client_payments" ("project_id");
        CREATE INDEX IF NOT EXISTS "client_payments_user_id_idx" ON "client_payments" ("user_id");
        CREATE INDEX IF NOT EXISTS "client_payments_status_idx" ON "client_payments" ("status");

        CREATE INDEX IF NOT EXISTS "credit_notes_credit_note_number_idx" ON "credit_notes" ("credit_note_number");
        CREATE INDEX IF NOT EXISTS "credit_notes_invoice_id_idx" ON "credit_notes" ("invoice_id");
        CREATE INDEX IF NOT EXISTS "credit_notes_user_id_idx" ON "credit_notes" ("user_id");
        CREATE INDEX IF NOT EXISTS "credit_notes_status_idx" ON "credit_notes" ("status");

        CREATE INDEX IF NOT EXISTS "refunds_refund_number_idx" ON "refunds" ("refund_number");
        CREATE INDEX IF NOT EXISTS "refunds_credit_note_id_idx" ON "refunds" ("credit_note_id");
        CREATE INDEX IF NOT EXISTS "refunds_status_idx" ON "refunds" ("status");

        CREATE INDEX IF NOT EXISTS "financial_journals_journal_number_idx" ON "financial_journals" ("journal_number");
        CREATE INDEX IF NOT EXISTS "financial_journals_reference_idx" ON "financial_journals" ("reference_type", "reference_id");
        CREATE INDEX IF NOT EXISTS "financial_journals_posted_at_idx" ON "financial_journals" ("posted_at");

        CREATE INDEX IF NOT EXISTS "journal_entries_journal_id_idx" ON "journal_entries" ("journal_id");
        CREATE INDEX IF NOT EXISTS "journal_entries_account_code_idx" ON "journal_entries" ("account_code");
    `);

    console.log("Durable migrations successfully applied to database.");
}

applyDurableMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Migration failed:", err);
        process.exit(1);
    });

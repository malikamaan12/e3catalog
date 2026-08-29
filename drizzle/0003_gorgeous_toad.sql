CREATE TABLE "document_sequences" (
	"document_type" varchar(50) NOT NULL,
	"year" integer NOT NULL,
	"current_value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_sequences_document_type_year_pk" PRIMARY KEY("document_type","year")
);
--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"payment_id" varchar(255) NOT NULL,
	"invoice_id" varchar(255) NOT NULL,
	"amount" real NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"allocated_at" timestamp DEFAULT now() NOT NULL,
	"allocated_by" varchar(255),
	"notes" varchar(1000),
	"reversed_at" timestamp,
	"reversed_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "vendor_payouts" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"payout_number" varchar(100) NOT NULL,
	"vendor_id" varchar(255) NOT NULL,
	"ledger_id" varchar(255),
	"amount" real NOT NULL,
	"currency" varchar(10) DEFAULT 'QAR' NOT NULL,
	"payout_method" varchar(50) DEFAULT 'bank_transfer' NOT NULL,
	"transaction_ref" varchar(255),
	"payout_proof_url" varchar(500),
	"status" varchar(50) DEFAULT 'approved_paid' NOT NULL,
	"processed_by" varchar(255),
	"processed_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_payouts_payout_number_unique" UNIQUE("payout_number")
);
--> statement-breakpoint
CREATE TABLE "vendor_remittances" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"remittance_number" varchar(100) NOT NULL,
	"vendor_id" varchar(255) NOT NULL,
	"booking_id" varchar(255),
	"amount_collected" real NOT NULL,
	"platform_commission_owed" real NOT NULL,
	"remittance_evidence_url" varchar(500),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"verified_by" varchar(255),
	"verified_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_remittances_remittance_number_unique" UNIQUE("remittance_number")
);
--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_client_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."client_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_allocated_by_users_id_fk" FOREIGN KEY ("allocated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_reversed_by_users_id_fk" FOREIGN KEY ("reversed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payouts" ADD CONSTRAINT "vendor_payouts_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payouts" ADD CONSTRAINT "vendor_payouts_ledger_id_vendor_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."vendor_ledgers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payouts" ADD CONSTRAINT "vendor_payouts_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_remittances" ADD CONSTRAINT "vendor_remittances_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_remittances" ADD CONSTRAINT "vendor_remittances_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_remittances" ADD CONSTRAINT "vendor_remittances_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_allocations_payment_id_idx" ON "payment_allocations" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_allocations_invoice_id_idx" ON "payment_allocations" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payment_allocations_status_idx" ON "payment_allocations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vendor_payouts_payout_number_idx" ON "vendor_payouts" USING btree ("payout_number");--> statement-breakpoint
CREATE INDEX "vendor_payouts_vendor_id_idx" ON "vendor_payouts" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_payouts_ledger_id_idx" ON "vendor_payouts" USING btree ("ledger_id");--> statement-breakpoint
CREATE INDEX "vendor_remittances_remittance_number_idx" ON "vendor_remittances" USING btree ("remittance_number");--> statement-breakpoint
CREATE INDEX "vendor_remittances_vendor_id_idx" ON "vendor_remittances" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_remittances_booking_id_idx" ON "vendor_remittances" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "vendor_remittances_status_idx" ON "vendor_remittances" USING btree ("status");
CREATE TABLE "booking_dispatch_logs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"booking_id" varchar(255) NOT NULL,
	"driver_name" varchar(255) NOT NULL,
	"vehicle_plate_number" varchar(255) NOT NULL,
	"transport_company" varchar(255) DEFAULT 'E3 Internal Fleet' NOT NULL,
	"total_gross_weight" integer,
	"dispatched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_payments" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"payment_number" varchar(100) NOT NULL,
	"invoice_id" varchar(255),
	"booking_id" varchar(255),
	"project_id" varchar(255),
	"user_id" varchar(255),
	"amount" real NOT NULL,
	"currency" varchar(10) DEFAULT 'QAR' NOT NULL,
	"payment_method" varchar(50) DEFAULT 'bank_transfer' NOT NULL,
	"transaction_ref" varchar(255),
	"payment_proof_url" varchar(500),
	"status" varchar(50) DEFAULT 'pending_verification' NOT NULL,
	"verified_by" varchar(255),
	"verified_at" timestamp,
	"rejection_reason" varchar(500),
	"notes" text,
	"payment_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_payments_payment_number_unique" UNIQUE("payment_number")
);
--> statement-breakpoint
CREATE TABLE "credit_notes" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"credit_note_number" varchar(100) NOT NULL,
	"invoice_id" varchar(255) NOT NULL,
	"booking_id" varchar(255),
	"user_id" varchar(255),
	"amount" real NOT NULL,
	"currency" varchar(10) DEFAULT 'QAR' NOT NULL,
	"reason" varchar(500) NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"issued_by" varchar(255),
	"issued_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credit_notes_credit_note_number_unique" UNIQUE("credit_note_number")
);
--> statement-breakpoint
CREATE TABLE "financial_journals" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"journal_number" varchar(100) NOT NULL,
	"reference_type" varchar(50) NOT NULL,
	"reference_id" varchar(255) NOT NULL,
	"description" varchar(500) NOT NULL,
	"is_reversed" boolean DEFAULT false,
	"reversal_journal_id" varchar(255),
	"posted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "financial_journals_journal_number_unique" UNIQUE("journal_number")
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"invoice_id" varchar(255) NOT NULL,
	"booking_id" varchar(255),
	"product_id" varchar(255),
	"description" varchar(500) NOT NULL,
	"units" integer DEFAULT 1 NOT NULL,
	"days" integer DEFAULT 1 NOT NULL,
	"unit_price" real DEFAULT 0 NOT NULL,
	"line_total" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"booking_id" varchar(255),
	"project_id" varchar(255),
	"user_id" varchar(255),
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
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"journal_id" varchar(255) NOT NULL,
	"account_code" varchar(100) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"debit" real DEFAULT 0 NOT NULL,
	"credit" real DEFAULT 0 NOT NULL,
	"memo" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_records" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"unit_id" varchar(255) NOT NULL,
	"reported_by" varchar(255),
	"issue_category" varchar(100) NOT NULL,
	"severity" varchar(50) DEFAULT 'medium' NOT NULL,
	"assigned_technician" varchar(255),
	"status" varchar(50) DEFAULT 'open' NOT NULL,
	"work_notes" text,
	"resolution_notes" text,
	"estimated_cost" real,
	"actual_cost" real,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"target_completion_date" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"refund_number" varchar(100) NOT NULL,
	"credit_note_id" varchar(255),
	"payment_id" varchar(255),
	"user_id" varchar(255),
	"amount" real NOT NULL,
	"currency" varchar(10) DEFAULT 'QAR' NOT NULL,
	"refund_method" varchar(50) DEFAULT 'bank_transfer' NOT NULL,
	"transaction_ref" varchar(255),
	"reason" varchar(500) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"processed_by" varchar(255),
	"processed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_refund_number_unique" UNIQUE("refund_number")
);
--> statement-breakpoint
CREATE TABLE "staging_inventory" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"vendor_id" varchar(255),
	"rough_name" varchar(255) DEFAULT '' NOT NULL,
	"rough_image_url" varchar(500),
	"rough_category" varchar(255),
	"dimensions" varchar(255),
	"weight" varchar(100),
	"technical_notes" text,
	"counted_quantity" integer DEFAULT 0 NOT NULL,
	"migration_status" varchar(50) DEFAULT 'counting' NOT NULL,
	"migrated_product_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_commercial_terms" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"vendor_id" varchar(255) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"commission_type" varchar(50) DEFAULT 'percentage' NOT NULL,
	"commission_value" real DEFAULT 20 NOT NULL,
	"effective_date" timestamp DEFAULT now() NOT NULL,
	"payout_terms" varchar(255),
	"special_conditions" varchar(1000),
	"approved_by" varchar(255),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_documents" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"vendor_id" varchar(255) NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"issue_date" timestamp,
	"expiry_date" timestamp,
	"issuing_authority" varchar(255),
	"status" varchar(50) DEFAULT 'uploaded' NOT NULL,
	"reviewer_id" varchar(255),
	"reviewer_notes" varchar(1000),
	"rejection_reason" varchar(1000),
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_team_members" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"vendor_id" varchar(255) NOT NULL,
	"user_id" varchar(255),
	"invited_email" varchar(255) NOT NULL,
	"invitation_token" varchar(255),
	"role" varchar(50) DEFAULT 'viewer' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"token_expires_at" timestamp,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_team_members_invitation_token_unique" UNIQUE("invitation_token")
);
--> statement-breakpoint
CREATE TABLE "vendor_warehouses" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"vendor_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" varchar(500),
	"city" varchar(255),
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "signature_data" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "signed_at" timestamp;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "booking_id" varchar(255);--> statement-breakpoint
ALTER TABLE "inventory_units" ADD COLUMN "warehouse_id" varchar(255);--> statement-breakpoint
ALTER TABLE "inventory_units" ADD COLUMN "shelf_location" varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "status" varchar(50) DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand" varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "model" varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "replacement_value" real;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "meta_title" varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "meta_description" varchar(500);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "keywords" varchar(500);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "trading_name" varchar(255);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "cr_number" varchar(255);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "trade_license_number" varchar(255);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "company_type" varchar(100);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "country" varchar(100) DEFAULT 'Qatar';--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "address" varchar(500);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "city" varchar(100) DEFAULT 'Doha';--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "year_established" integer;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "lifecycle_status" varchar(50) DEFAULT 'application_draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "rejection_reason" varchar(1000);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "changes_requested_reason" varchar(1000);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "suspension_reason" varchar(1000);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "approved_by" varchar(255);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "equipment_categories" jsonb;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "warehouse_locations" jsonb;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "fleet_size" varchar(100);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "operating_regions" jsonb;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "banner_url" varchar(500);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "brand_story" text;--> statement-breakpoint
ALTER TABLE "booking_dispatch_logs" ADD CONSTRAINT "booking_dispatch_logs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_journal_id_financial_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."financial_journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_unit_id_inventory_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."inventory_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_credit_note_id_credit_notes_id_fk" FOREIGN KEY ("credit_note_id") REFERENCES "public"."credit_notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_client_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."client_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staging_inventory" ADD CONSTRAINT "staging_inventory_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staging_inventory" ADD CONSTRAINT "staging_inventory_migrated_product_id_products_id_fk" FOREIGN KEY ("migrated_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_commercial_terms" ADD CONSTRAINT "vendor_commercial_terms_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_commercial_terms" ADD CONSTRAINT "vendor_commercial_terms_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_team_members" ADD CONSTRAINT "vendor_team_members_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_team_members" ADD CONSTRAINT "vendor_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_warehouses" ADD CONSTRAINT "vendor_warehouses_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_dispatch_logs_booking_id_idx" ON "booking_dispatch_logs" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "client_payments_payment_number_idx" ON "client_payments" USING btree ("payment_number");--> statement-breakpoint
CREATE INDEX "client_payments_invoice_id_idx" ON "client_payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "client_payments_project_id_idx" ON "client_payments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "client_payments_user_id_idx" ON "client_payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "client_payments_status_idx" ON "client_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "credit_notes_credit_note_number_idx" ON "credit_notes" USING btree ("credit_note_number");--> statement-breakpoint
CREATE INDEX "credit_notes_invoice_id_idx" ON "credit_notes" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "credit_notes_user_id_idx" ON "credit_notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_notes_status_idx" ON "credit_notes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "financial_journals_journal_number_idx" ON "financial_journals" USING btree ("journal_number");--> statement-breakpoint
CREATE INDEX "financial_journals_reference_idx" ON "financial_journals" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "financial_journals_posted_at_idx" ON "financial_journals" USING btree ("posted_at");--> statement-breakpoint
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_items_product_id_idx" ON "invoice_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "invoices_invoice_number_idx" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_booking_id_idx" ON "invoices" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "invoices_project_id_idx" ON "invoices" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "invoices_user_id_idx" ON "invoices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_due_date_idx" ON "invoices" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "journal_entries_journal_id_idx" ON "journal_entries" USING btree ("journal_id");--> statement-breakpoint
CREATE INDEX "journal_entries_account_code_idx" ON "journal_entries" USING btree ("account_code");--> statement-breakpoint
CREATE INDEX "maintenance_records_unit_id_idx" ON "maintenance_records" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "maintenance_records_status_idx" ON "maintenance_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "maintenance_records_opened_at_idx" ON "maintenance_records" USING btree ("opened_at");--> statement-breakpoint
CREATE INDEX "refunds_refund_number_idx" ON "refunds" USING btree ("refund_number");--> statement-breakpoint
CREATE INDEX "refunds_credit_note_id_idx" ON "refunds" USING btree ("credit_note_id");--> statement-breakpoint
CREATE INDEX "refunds_status_idx" ON "refunds" USING btree ("status");--> statement-breakpoint
CREATE INDEX "staging_inventory_vendor_id_idx" ON "staging_inventory" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "staging_inventory_status_idx" ON "staging_inventory" USING btree ("migration_status");--> statement-breakpoint
CREATE INDEX "vendor_commercial_terms_vendor_id_idx" ON "vendor_commercial_terms" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_commercial_terms_status_idx" ON "vendor_commercial_terms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vendor_documents_vendor_id_idx" ON "vendor_documents" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_documents_status_idx" ON "vendor_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vendor_team_members_vendor_id_idx" ON "vendor_team_members" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_team_members_user_id_idx" ON "vendor_team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vendor_team_members_token_idx" ON "vendor_team_members" USING btree ("invitation_token");--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_units" ADD CONSTRAINT "inventory_units_warehouse_id_vendor_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."vendor_warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vendors_lifecycle_status_idx" ON "vendors" USING btree ("lifecycle_status");
CREATE TABLE "booking_unit_assignments" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"booking_id" varchar(255) NOT NULL,
	"inventory_unit_id" varchar(255) NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"scanned_out_at" timestamp,
	"scanned_in_at" timestamp,
	"status" varchar(50) DEFAULT 'reserved' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_settlements" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"vendor_id" varchar(255) NOT NULL,
	"booking_id" varchar(255) NOT NULL,
	"amount_owed" real NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"payment_evidence_url" varchar(500),
	"admin_notes" varchar(1000),
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_logs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"unit_id" varchar(255) NOT NULL,
	"inspector_id" varchar(255) NOT NULL,
	"inspection_type" varchar(50) DEFAULT 'routine' NOT NULL,
	"condition_before" varchar(50) NOT NULL,
	"condition_after" varchar(50) NOT NULL,
	"notes" varchar(2000),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"booking_id" varchar(255) NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"vendor_id" varchar(255),
	"user_id" varchar(255),
	"customer_name" varchar(255) NOT NULL,
	"rating" integer NOT NULL,
	"condition_score" integer,
	"delivery_score" integer,
	"comment" varchar(2000),
	"is_verified" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "vendor_ledgers" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"vendor_id" varchar(255) NOT NULL,
	"booking_id" varchar(255) NOT NULL,
	"project_id" varchar(255),
	"amount" real NOT NULL,
	"commission_rate" real NOT NULL,
	"platform_fee" real NOT NULL,
	"vendor_payout" real NOT NULL,
	"status" varchar(50) DEFAULT 'pending_payout' NOT NULL,
	"notes" varchar(1000),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "value" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "inventory_units" ADD COLUMN "vendor_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_units" ADD COLUMN "asset_tag_code" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_units" ADD COLUMN "condition_status" varchar(50) DEFAULT 'excellent' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_units" ADD COLUMN "availability_status" varchar(50) DEFAULT 'in_warehouse' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_units" ADD COLUMN "last_inspection_date" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "item_code" varchar(100);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "view_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "average_rating" real DEFAULT 5;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "review_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_published" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "commission_type" varchar(50) DEFAULT 'percentage' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "commission_value" real DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_unit_assignments" ADD CONSTRAINT "booking_unit_assignments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_unit_assignments" ADD CONSTRAINT "booking_unit_assignments_inventory_unit_id_inventory_units_id_fk" FOREIGN KEY ("inventory_unit_id") REFERENCES "public"."inventory_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_settlements" ADD CONSTRAINT "commission_settlements_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_settlements" ADD CONSTRAINT "commission_settlements_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_logs" ADD CONSTRAINT "inspection_logs_unit_id_inventory_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."inventory_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_logs" ADD CONSTRAINT "inspection_logs_inspector_id_users_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_ledgers" ADD CONSTRAINT "vendor_ledgers_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_ledgers" ADD CONSTRAINT "vendor_ledgers_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_unit_assignments_booking_id_idx" ON "booking_unit_assignments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_unit_assignments_unit_id_idx" ON "booking_unit_assignments" USING btree ("inventory_unit_id");--> statement-breakpoint
CREATE INDEX "commission_settlements_vendor_id_idx" ON "commission_settlements" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "commission_settlements_booking_id_idx" ON "commission_settlements" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "commission_settlements_status_idx" ON "commission_settlements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inspection_logs_unit_id_idx" ON "inspection_logs" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "inspection_logs_inspector_id_idx" ON "inspection_logs" USING btree ("inspector_id");--> statement-breakpoint
CREATE INDEX "vendor_ledgers_vendor_id_idx" ON "vendor_ledgers" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_ledgers_booking_id_idx" ON "vendor_ledgers" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "vendor_ledgers_status_idx" ON "vendor_ledgers" USING btree ("status");--> statement-breakpoint
ALTER TABLE "inventory_units" ADD CONSTRAINT "inventory_units_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_product_id_idx" ON "bookings" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_start_date_idx" ON "bookings" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "bookings_end_date_idx" ON "bookings" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "inventory_units_product_id_idx" ON "inventory_units" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_units_vendor_id_idx" ON "inventory_units" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "inventory_units_tag_idx" ON "inventory_units" USING btree ("asset_tag_code");--> statement-breakpoint
CREATE INDEX "inventory_units_status_idx" ON "inventory_units" USING btree ("availability_status");--> statement-breakpoint
CREATE INDEX "products_vendor_id_idx" ON "products" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_featured_idx" ON "products" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "products_rating_idx" ON "products" USING btree ("average_rating");--> statement-breakpoint
CREATE INDEX "vendors_user_id_idx" ON "vendors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vendors_store_status_idx" ON "vendors" USING btree ("store_status");--> statement-breakpoint
CREATE INDEX "vendors_score_rating_idx" ON "vendors" USING btree ("score_rating");--> statement-breakpoint
ALTER TABLE "inventory_units" DROP COLUMN "condition";--> statement-breakpoint
ALTER TABLE "inventory_units" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "inventory_units" ADD CONSTRAINT "inventory_units_asset_tag_code_unique" UNIQUE("asset_tag_code");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_item_code_unique" UNIQUE("item_code");
CREATE TABLE "admin_settings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"label" varchar(255) NOT NULL,
	"content" varchar(2000) NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"vendor_id" varchar(255),
	"product_id" varchar(255) NOT NULL,
	"units" integer DEFAULT 1 NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"start_time" varchar(10),
	"end_time" varchar(10),
	"status" varchar(50) DEFAULT 'request' NOT NULL,
	"payment_status" varchar(50) DEFAULT 'unpaid' NOT NULL,
	"buffer_before" integer DEFAULT 0,
	"buffer_after" integer DEFAULT 0,
	"fulfillment_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"warehouse_notes" varchar(1000),
	"user_id" varchar(255),
	"project_id" varchar(255),
	"project_name" varchar(255),
	"customer_name" varchar(255) NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"customer_phone" varchar(255),
	"total_price" real,
	"discount" real DEFAULT 0,
	"logistics_cost" real DEFAULT 0,
	"labor_cost" real DEFAULT 0,
	"additional_charge_name" varchar(255),
	"additional_charge_amount" real DEFAULT 0,
	"additional_charge_type" varchar(50) DEFAULT 'fixed',
	"notes" varchar(2000),
	"admin_notes" varchar(2000),
	"client_notes" varchar(2000),
	"selected_terms" jsonb,
	"payment_terms" varchar(500),
	"payment_method" varchar(500),
	"custom_notes" varchar(2000),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"added_by_admin" boolean DEFAULT false,
	"admin_item_note" varchar(1000)
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"user_id" varchar(255),
	"product_id" varchar(255) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"start_time" varchar(10),
	"end_time" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"parent_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"image" varchar(500),
	"icon" varchar(255),
	"description" varchar(1000),
	"sort_order" integer DEFAULT 0,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"sender_id" varchar(255) NOT NULL,
	"receiver_id" varchar(255) NOT NULL,
	"project_id" varchar(255),
	"content" varchar(2000) NOT NULL,
	"attachment_url" varchar(500),
	"attachment_type" varchar(50),
	"attachment_name" varchar(255),
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_charges" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(500),
	"charge_type" varchar(50) DEFAULT 'fixed' NOT NULL,
	"amount" real NOT NULL,
	"auto_apply_to_all" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installation_guides" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"guide_type" varchar(50) NOT NULL,
	"content" varchar(5000) NOT NULL,
	"required_manpower" integer,
	"estimated_time" varchar(255),
	"tools_required" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "inventory_overrides" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"units_offline" integer NOT NULL,
	"reason" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_units" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"serial_number" varchar(255),
	"condition" varchar(50) DEFAULT 'excellent' NOT NULL,
	"status" varchar(50) DEFAULT 'available' NOT NULL,
	"warehouse_location" varchar(255),
	"purchase_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"booking_id" varchar(255),
	"title" varchar(255) NOT NULL,
	"message" varchar(1000) NOT NULL,
	"type" varchar(50) NOT NULL,
	"channel" varchar(50) DEFAULT 'in_app' NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"conditions" jsonb NOT NULL,
	"charge_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_documents" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" varchar(500) NOT NULL,
	"type" varchar(50) NOT NULL,
	"size" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_media" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"url" varchar(500) NOT NULL,
	"thumbnail_url" varchar(500),
	"alt" varchar(255),
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "product_tags" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"tag_id" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"vendor_id" varchar(255),
	"category_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"short_description" varchar(500),
	"description" varchar(2000),
	"dimensions" varchar(255),
	"weight" varchar(255),
	"power_requirements" varchar(255),
	"materials" varchar(255),
	"show_price" boolean DEFAULT true NOT NULL,
	"price_type" varchar(50) DEFAULT 'daily' NOT NULL,
	"price_range_max" real,
	"price_per_day" real NOT NULL,
	"price_per_hour" real,
	"packaging_fee" real DEFAULT 0,
	"handling_fee" real DEFAULT 0,
	"setup_fee" real DEFAULT 0,
	"unit" varchar(50) DEFAULT 'unit' NOT NULL,
	"min_order_qty" integer DEFAULT 1 NOT NULL,
	"install_time" integer DEFAULT 0,
	"dismantle_time" integer DEFAULT 0,
	"cleaning_time" integer DEFAULT 0,
	"manpower" varchar(255),
	"tools" varchar(255),
	"thumbnail_url" varchar(500),
	"requires_license" boolean DEFAULT false,
	"requires_approval" boolean DEFAULT false,
	"featured" boolean DEFAULT false,
	"admin_notes" varchar(1000),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "safety_certificates" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"cert_name" varchar(255) NOT NULL,
	"cert_number" varchar(255),
	"issuing_body" varchar(255),
	"issue_date" timestamp NOT NULL,
	"expiry_date" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" varchar(2000) NOT NULL,
	"group" varchar(50) DEFAULT 'general' NOT NULL,
	"description" varchar(500),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"admin_id" varchar(255) NOT NULL,
	"action" varchar(255) NOT NULL,
	"target_id" varchar(255),
	"target_type" varchar(50) NOT NULL,
	"details" varchar(1000),
	"ip_address" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"color" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone_number" varchar(255),
	"password" varchar(255),
	"role" varchar(50) DEFAULT 'client' NOT NULL,
	"image" varchar(255),
	"company_name" varchar(255),
	"registration_no" varchar(255),
	"location" varchar(255),
	"address" varchar(500),
	"designation" varchar(255),
	"alternate_phone" varchar(255),
	"poc_name" varchar(255),
	"poc_phone" varchar(255),
	"poc_email" varchar(255),
	"poc_designation" varchar(255),
	"project_contacts" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"last_login_ip" varchar(50),
	"last_login_location" varchar(255),
	"last_active" timestamp,
	"vendor_id" varchar(255),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"kyc_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"agreement_status" varchar(50) DEFAULT 'unsigned' NOT NULL,
	"payout_details" varchar(500),
	"commission_rate" real,
	"website" varchar(255),
	"tax_id" varchar(255),
	"tax_card_url" varchar(500),
	"company_registration_url" varchar(500),
	"letterhead_header_url" varchar(500),
	"letterhead_footer_url" varchar(500),
	"tax_card_expiry" timestamp,
	"company_registration_expiry" timestamp,
	"poc_name" varchar(255),
	"poc_phone" varchar(255),
	"alternate_poc_name" varchar(255),
	"alternate_poc_phone" varchar(255),
	"logo_url" varchar(500),
	"bank_name" varchar(255),
	"account_name" varchar(255),
	"account_number" varchar(255),
	"iban" varchar(255),
	"swift" varchar(255),
	"payment_terms" varchar(255),
	"store_status" varchar(50) DEFAULT 'active' NOT NULL,
	"score_delivery" integer DEFAULT 100,
	"score_condition" integer DEFAULT 100,
	"score_rating" real DEFAULT 5,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installation_guides" ADD CONSTRAINT "installation_guides_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_overrides" ADD CONSTRAINT "inventory_overrides_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_units" ADD CONSTRAINT "inventory_units_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_charge_id_global_charges_id_fk" FOREIGN KEY ("charge_id") REFERENCES "public"."global_charges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_documents" ADD CONSTRAINT "product_documents_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_certificates" ADD CONSTRAINT "safety_certificates_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
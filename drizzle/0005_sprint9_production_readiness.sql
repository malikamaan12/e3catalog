CREATE TABLE IF NOT EXISTS "auth_tokens" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processed_webhooks" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"webhook_id" varchar(255) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'processed' NOT NULL,
	"payload_hash" varchar(255),
	"metadata" jsonb,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "processed_webhooks_webhook_id_unique" UNIQUE("webhook_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limit_entries" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"expire_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_tokens_user_id_idx" ON "auth_tokens" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_tokens_token_hash_idx" ON "auth_tokens" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_tokens_type_idx" ON "auth_tokens" USING btree ("type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processed_webhooks_webhook_id_idx" ON "processed_webhooks" USING btree ("webhook_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processed_webhooks_provider_idx" ON "processed_webhooks" USING btree ("provider");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limit_entries_key_idx" ON "rate_limit_entries" USING btree ("key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limit_entries_expire_at_idx" ON "rate_limit_entries" USING btree ("expire_at");

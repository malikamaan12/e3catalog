CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"actor_id" varchar(255),
	"actor_email" varchar(255),
	"actor_role" varchar(50),
	"tenant_id" varchar(255),
	"action" varchar(100) NOT NULL,
	"object_type" varchar(100) NOT NULL,
	"object_id" varchar(255),
	"before_state" jsonb,
	"after_state" jsonb,
	"reason" varchar(1000),
	"correlation_id" varchar(255) NOT NULL,
	"ip_address" varchar(50),
	"user_agent" varchar(500),
	"severity" varchar(50) DEFAULT 'info' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance_rules" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"rule_code" varchar(100) NOT NULL,
	"rule_type" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1000),
	"target_type" varchar(50) NOT NULL,
	"target_id" varchar(255),
	"parameters" jsonb NOT NULL,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"effective_date" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "compliance_rules_rule_code_unique" UNIQUE("rule_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_outbox" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"recipient_id" varchar(255),
	"recipient_email" varchar(255),
	"recipient_phone" varchar(100),
	"channel" varchar(50) DEFAULT 'in_app' NOT NULL,
	"template_name" varchar(100),
	"payload" jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"provider_response" jsonb,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" varchar(1000),
	"correlation_id" varchar(255),
	"scheduled_for" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cron_job_runs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"job_name" varchar(100) NOT NULL,
	"trigger_type" varchar(50) DEFAULT 'scheduled' NOT NULL,
	"status" varchar(50) DEFAULT 'running' NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"duration_ms" integer,
	"items_processed" integer DEFAULT 0 NOT NULL,
	"items_failed" integer DEFAULT 0 NOT NULL,
	"error_details" jsonb,
	"locked_by" varchar(255),
	"lock_expires_at" timestamp,
	"triggered_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"session_token_hash" varchar(255) NOT NULL,
	"device_info" varchar(500),
	"ip_address" varchar(50),
	"is_revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "user_sessions_session_token_hash_unique" UNIQUE("session_token_hash")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "compliance_rules" ADD CONSTRAINT "compliance_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cron_job_runs" ADD CONSTRAINT "cron_job_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_object_idx" ON "audit_logs" USING btree ("object_type","object_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_correlation_id_idx" ON "audit_logs" USING btree ("correlation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_id_idx" ON "audit_logs" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compliance_rules_rule_code_idx" ON "compliance_rules" USING btree ("rule_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compliance_rules_rule_type_idx" ON "compliance_rules" USING btree ("rule_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compliance_rules_target_idx" ON "compliance_rules" USING btree ("target_type","target_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compliance_rules_is_active_idx" ON "compliance_rules" USING btree ("is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_outbox_recipient_id_idx" ON "notification_outbox" USING btree ("recipient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_outbox_status_idx" ON "notification_outbox" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_outbox_event_type_idx" ON "notification_outbox" USING btree ("event_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_outbox_created_at_idx" ON "notification_outbox" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_outbox_correlation_id_idx" ON "notification_outbox" USING btree ("correlation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_job_runs_job_name_idx" ON "cron_job_runs" USING btree ("job_name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_job_runs_status_idx" ON "cron_job_runs" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cron_job_runs_start_time_idx" ON "cron_job_runs" USING btree ("start_time");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_token_hash_idx" ON "user_sessions" USING btree ("session_token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_is_revoked_idx" ON "user_sessions" USING btree ("is_revoked");

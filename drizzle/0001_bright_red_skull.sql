CREATE TABLE `admin_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`label` text NOT NULL,
	`content` text NOT NULL,
	`is_default` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `payment_status` text DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `project_id` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `project_name` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `additional_charge_name` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `additional_charge_amount` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `bookings` ADD `additional_charge_type` text DEFAULT 'fixed';--> statement-breakpoint
ALTER TABLE `bookings` ADD `selected_terms` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `payment_terms` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `payment_method` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `custom_notes` text;--> statement-breakpoint
ALTER TABLE `bookings` DROP COLUMN `custom_fee`;--> statement-breakpoint
ALTER TABLE `bookings` DROP COLUMN `tax_rate`;--> statement-breakpoint
ALTER TABLE `products` ADD `show_price` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `price_type` text DEFAULT 'daily' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `price_range_max` real;--> statement-breakpoint
ALTER TABLE `products` ADD `packaging_fee` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `products` ADD `handling_fee` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `products` ADD `setup_fee` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `password` text;
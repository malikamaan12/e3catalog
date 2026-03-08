CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`units` integer DEFAULT 1 NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`status` text DEFAULT 'request' NOT NULL,
	`buffer_before` integer DEFAULT 0,
	`buffer_after` integer DEFAULT 0,
	`user_id` text,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`customer_phone` text,
	`total_price` real,
	`discount` real DEFAULT 0,
	`logistics_cost` real DEFAULT 0,
	`labor_cost` real DEFAULT 0,
	`custom_fee` real DEFAULT 0,
	`tax_rate` real DEFAULT 0,
	`notes` text,
	`admin_notes` text,
	`client_notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text,
	`product_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`image` text,
	`icon` text,
	`description` text,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `installation_guides` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`guide_type` text NOT NULL,
	`content` text NOT NULL,
	`required_manpower` integer,
	`estimated_time` text,
	`tools_required` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inventory_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`units_offline` integer NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`uploaded_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_media` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`type` text NOT NULL,
	`url` text NOT NULL,
	`thumbnail_url` text,
	`alt` text,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`short_description` text,
	`description` text,
	`dimensions` text,
	`weight` text,
	`power_requirements` text,
	`materials` text,
	`price_per_day` real NOT NULL,
	`price_per_hour` real,
	`total_units` integer DEFAULT 1 NOT NULL,
	`condition` text DEFAULT 'excellent' NOT NULL,
	`install_time` integer DEFAULT 0,
	`dismantle_time` integer DEFAULT 0,
	`cleaning_time` integer DEFAULT 0,
	`manpower` text,
	`tools` text,
	`thumbnail_url` text,
	`requires_license` integer DEFAULT false,
	`requires_approval` integer DEFAULT false,
	`featured` integer DEFAULT false,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE TABLE `safety_certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`cert_name` text NOT NULL,
	`cert_number` text,
	`issuing_body` text,
	`issue_date` text NOT NULL,
	`expiry_date` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone_number` text,
	`role` text DEFAULT 'client' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
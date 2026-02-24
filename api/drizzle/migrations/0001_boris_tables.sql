CREATE TABLE `repository` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_repository` (
	`user_id` text NOT NULL,
	`repository_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `repository_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`repository_id`) REFERENCES `repository`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_repository_user_idx` ON `user_repository` (`user_id`);--> statement-breakpoint
CREATE TABLE `api_key` (
	`id` text PRIMARY KEY NOT NULL,
	`repository_id` text NOT NULL,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`repository_id`) REFERENCES `repository`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_key_key_hash_unique` ON `api_key` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_key_repository_idx` ON `api_key` (`repository_id`);--> statement-breakpoint
CREATE TABLE `package` (
	`id` text PRIMARY KEY NOT NULL,
	`repository_id` text NOT NULL,
	`name` text NOT NULL,
	`path` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`repository_id`) REFERENCES `repository`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `package_repository_idx` ON `package` (`repository_id`);--> statement-breakpoint
CREATE TABLE `package_evolution` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`pr_number` integer NOT NULL,
	`pr_title` text,
	`branch` text NOT NULL,
	`commit_sha` text NOT NULL,
	`export_path` text NOT NULL,
	`file_name` text NOT NULL,
	`main_size` integer NOT NULL,
	`pr_size` integer NOT NULL,
	`reported_at` integer NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `package`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `package_evolution_package_idx` ON `package_evolution` (`package_id`);--> statement-breakpoint
CREATE INDEX `package_evolution_pr_idx` ON `package_evolution` (`package_id`, `pr_number`);

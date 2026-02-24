ALTER TABLE `package_evolution` ADD `pr_merged` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `package_evolution` ADD `pr_state` text DEFAULT 'open' NOT NULL;

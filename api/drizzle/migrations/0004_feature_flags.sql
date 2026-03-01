CREATE TABLE `feature_flag` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`enabled` integer NOT NULL DEFAULT 0,
	`allowed_user_ids` text,
	`rollout_percentage` integer NOT NULL DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feature_flag_name_idx` ON `feature_flag` (`name`);

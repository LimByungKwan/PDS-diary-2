CREATE TABLE `study_days` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text NOT NULL,
	`day_number` integer NOT NULL,
	`date` text NOT NULL,
	`task_id` text NOT NULL,
	`expected_minutes` real NOT NULL,
	`actual_minutes` real,
	`evidence` text,
	`note` text,
	`opened_at` text NOT NULL,
	`closed_at` text,
	FOREIGN KEY (`experiment_id`) REFERENCES `study_experiments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_day_number` ON `study_days` (`experiment_id`,`day_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `study_day_date` ON `study_days` (`experiment_id`,`date`);--> statement-breakpoint
CREATE TABLE `study_experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`start_date` text NOT NULL,
	`protocol` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_experiments_user_id_unique` ON `study_experiments` (`user_id`);--> statement-breakpoint
CREATE TABLE `study_rule_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text NOT NULL,
	`rule` text NOT NULL,
	`reason` text NOT NULL,
	`day_one_id` text NOT NULL,
	`day_two_id` text NOT NULL,
	`changed_at` text NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `study_experiments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`day_one_id`) REFERENCES `study_days`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`day_two_id`) REFERENCES `study_days`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_rule_changes_experiment_id_unique` ON `study_rule_changes` (`experiment_id`);
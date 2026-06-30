ALTER TABLE `repayment_claims` ADD COLUMN `purchase_id` integer REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE no action;
--> statement-breakpoint
ALTER TABLE `repayments` ADD COLUMN `purchase_id` integer REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE no action;

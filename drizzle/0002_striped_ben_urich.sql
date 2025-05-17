ALTER TABLE "api_keys" ADD COLUMN "daily_usage_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "monthly_usage_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "rate_limit" integer;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "rate_limit_interval" varchar(50);
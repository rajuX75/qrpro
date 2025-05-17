CREATE TABLE "dynamic_qr_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"short_id" varchar(256) NOT NULL,
	"api_key_id" integer NOT NULL,
	"target_url" text NOT NULL,
	"original_data_encoded" text NOT NULL,
	"customization_params" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dynamic_qr_codes_short_id_unique" UNIQUE("short_id")
);
--> statement-breakpoint
CREATE TABLE "scan_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"dynamic_qr_code_id" integer NOT NULL,
	"scanned_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(256),
	"user_agent" text,
	"geolocation" jsonb
);
--> statement-breakpoint
ALTER TABLE "dynamic_qr_codes" ADD CONSTRAINT "dynamic_qr_codes_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_dynamic_qr_code_id_dynamic_qr_codes_id_fk" FOREIGN KEY ("dynamic_qr_code_id") REFERENCES "public"."dynamic_qr_codes"("id") ON DELETE no action ON UPDATE no action;
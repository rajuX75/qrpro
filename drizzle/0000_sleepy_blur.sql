CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"status" varchar(256) DEFAULT 'active' NOT NULL,
	"tier" varchar(256) DEFAULT 'free' NOT NULL,
	"usage_count" serial NOT NULL,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);

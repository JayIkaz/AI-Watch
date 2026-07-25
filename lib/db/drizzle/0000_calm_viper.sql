CREATE TYPE "public"."news_credibility" AS ENUM('verified', 'likely', 'unverified', 'gossip');--> statement-breakpoint
CREATE TYPE "public"."news_source_type" AS ENUM('major-outlet', 'tech-blog', 'newsletter', 'social', 'forum');--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo_url" text,
	"website_url" text,
	"tier" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"raw_content" text,
	"source_url" text,
	"published_at" timestamp,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"vendor_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"confidence_score" real,
	"classification_reasoning" text,
	"flagged_for_review" boolean DEFAULT false NOT NULL,
	"high_impact" boolean DEFAULT false NOT NULL,
	"why_it_matters" text,
	"deduplication_hash" text,
	CONSTRAINT "updates_deduplication_hash_unique" UNIQUE("deduplication_hash")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"vendor_slugs" text[] DEFAULT '{}' NOT NULL,
	"category_slugs" text[] DEFAULT '{}' NOT NULL,
	"digest_frequency" text DEFAULT 'none' NOT NULL,
	"alert_keywords" text[] DEFAULT '{}' NOT NULL,
	"email_alerts" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"items_processed" integer DEFAULT 0 NOT NULL,
	"items_created" integer DEFAULT 0 NOT NULL,
	"errors" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'running' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"source_type" text NOT NULL,
	"url" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_checked_at" timestamp,
	"last_success_at" timestamp,
	"last_error_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"raw_content" text,
	"source_url" text,
	"source_name" text NOT NULL,
	"source_type" "news_source_type" DEFAULT 'tech-blog' NOT NULL,
	"credibility_rating" "news_credibility" DEFAULT 'unverified' NOT NULL,
	"credibility_reason" text,
	"mentioned_vendors" text[] DEFAULT '{}',
	"published_at" timestamp,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"high_interest" boolean DEFAULT false NOT NULL,
	"deduplication_hash" text,
	CONSTRAINT "news_items_deduplication_hash_unique" UNIQUE("deduplication_hash")
);
--> statement-breakpoint
CREATE TABLE "news_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"source_type" "news_source_type" DEFAULT 'tech-blog' NOT NULL,
	"default_credibility" "news_credibility" DEFAULT 'unverified' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_checked_at" timestamp,
	"last_success_at" timestamp,
	"last_error_at" timestamp,
	"last_error" text,
	CONSTRAINT "news_sources_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "user_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"item_type" text NOT NULL,
	"item_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_id_mapping" (
	"old_user_id" text PRIMARY KEY NOT NULL,
	"new_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "updates" ADD CONSTRAINT "updates_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "updates" ADD CONSTRAINT "updates_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_sources" ADD CONSTRAINT "ingestion_sources_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "updates_vendor_idx" ON "updates" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "updates_category_idx" ON "updates" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "updates_detected_at_idx" ON "updates" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "updates_published_at_idx" ON "updates" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "api_keys_user_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "news_items_source_type_idx" ON "news_items" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "news_items_credibility_idx" ON "news_items" USING btree ("credibility_rating");--> statement-breakpoint
CREATE INDEX "news_items_detected_at_idx" ON "news_items" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "news_sources_active_idx" ON "news_sources" USING btree ("active");--> statement-breakpoint
CREATE INDEX "user_likes_user_idx" ON "user_likes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_likes_unique_idx" ON "user_likes" USING btree ("user_id","item_type","item_id");
CREATE TYPE "public"."jurisdiction" AS ENUM('eu', 'us_federal', 'us_state', 'uk', 'china', 'international');--> statement-breakpoint
CREATE TYPE "public"."regulation_type" AS ENUM('legislation', 'enforcement', 'guidance', 'court_ruling', 'standards', 'executive_action');--> statement-breakpoint
CREATE TYPE "public"."regulation_urgency" AS ENUM('deadline_approaching', 'enforcement_live', 'proposed_draft', 'adopted_future');--> statement-breakpoint
CREATE TABLE "regulation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"why_it_matters" text,
	"regulation_type" "regulation_type" NOT NULL,
	"jurisdiction" "jurisdiction" NOT NULL,
	"jurisdiction_detail" text,
	"urgency" "regulation_urgency" NOT NULL,
	"deadline_date" date,
	"deadline_label" text,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"last_verified" timestamp DEFAULT now() NOT NULL,
	"relevance" real,
	"affected_vendors" text[] DEFAULT '{}',
	"source_url" text,
	"source_name" text,
	"deduplication_hash" text,
	CONSTRAINT "regulation_items_deduplication_hash_unique" UNIQUE("deduplication_hash")
);
--> statement-breakpoint
CREATE INDEX "regulation_items_type_idx" ON "regulation_items" USING btree ("regulation_type");--> statement-breakpoint
CREATE INDEX "regulation_items_jurisdiction_idx" ON "regulation_items" USING btree ("jurisdiction");--> statement-breakpoint
CREATE INDEX "regulation_items_urgency_idx" ON "regulation_items" USING btree ("urgency");--> statement-breakpoint
CREATE INDEX "regulation_items_deadline_idx" ON "regulation_items" USING btree ("deadline_date");--> statement-breakpoint
CREATE INDEX "regulation_items_detected_at_idx" ON "regulation_items" USING btree ("detected_at");
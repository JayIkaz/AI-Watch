CREATE TABLE "vendor_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"alias" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_aliases_alias_unique" UNIQUE("alias")
);
--> statement-breakpoint
CREATE TABLE "news_item_vendors" (
	"news_item_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "news_item_vendors_news_item_id_vendor_id_pk" PRIMARY KEY("news_item_id","vendor_id")
);
--> statement-breakpoint
ALTER TABLE "vendor_aliases" ADD CONSTRAINT "vendor_aliases_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_item_vendors" ADD CONSTRAINT "news_item_vendors_news_item_id_news_items_id_fk" FOREIGN KEY ("news_item_id") REFERENCES "public"."news_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_item_vendors" ADD CONSTRAINT "news_item_vendors_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vendor_aliases_vendor_id_idx" ON "vendor_aliases" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "news_item_vendors_vendor_id_idx" ON "news_item_vendors" USING btree ("vendor_id");
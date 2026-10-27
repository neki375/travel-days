CREATE TABLE "countries" (
	"code" char(2) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "countries_code_format" CHECK ("countries"."code" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"country_code" char(2) NOT NULL,
	"entry_date" date NOT NULL,
	"exit_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trips_valid_dates" CHECK ("trips"."exit_date" IS NULL OR "trips"."exit_date" >= "trips"."entry_date")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id")
);
--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trips_one_open_per_user" ON "trips" USING btree ("user_id") WHERE "trips"."exit_date" IS NULL;--> statement-breakpoint
CREATE INDEX "trips_user_entry_date_idx" ON "trips" USING btree ("user_id","entry_date" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "trips_user_country_entry_idx" ON "trips" USING btree ("user_id","country_code","entry_date");
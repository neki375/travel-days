-- Database backstop for the overlap rule (SPEC.md §10.1). The service performs the full check.
-- Open ranges '()' let trips share a boundary day. One-day trips (exit_date = entry_date) would
-- be empty ranges, so they are excluded here and checked only by the service.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_no_overlap" EXCLUDE USING gist (
	"user_id" WITH =,
	tsrange("entry_date"::timestamp, COALESCE("exit_date"::timestamp, 'infinity'::timestamp), '()') WITH &&
) WHERE ("exit_date" IS NULL OR "exit_date" > "entry_date");

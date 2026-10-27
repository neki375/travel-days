import { sql } from "drizzle-orm";
import {
  bigint,
  char,
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// The exclusion constraint trips_no_overlap and the countries seed live in custom migrations:
// Drizzle cannot express them in the schema.

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Telegram user ids fit in 52 bits, so a JS number is exact.
  telegramId: bigint("telegram_id", { mode: "number" }).notNull().unique(),
  ...timestamps,
});

export const countries = pgTable(
  "countries",
  {
    code: char("code", { length: 2 }).primaryKey(),
    name: text("name").notNull(),
  },
  (table) => [check("countries_code_format", sql`${table.code} ~ '^[A-Z]{2}$'`)],
);

export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    countryCode: char("country_code", { length: 2 })
      .notNull()
      .references(() => countries.code),
    entryDate: date("entry_date", { mode: "string" }).notNull(),
    exitDate: date("exit_date", { mode: "string" }),
    ...timestamps,
  },
  (table) => [
    check(
      "trips_valid_dates",
      sql`${table.exitDate} IS NULL OR ${table.exitDate} >= ${table.entryDate}`,
    ),
    uniqueIndex("trips_one_open_per_user")
      .on(table.userId)
      .where(sql`${table.exitDate} IS NULL`),
    index("trips_user_entry_date_idx").on(table.userId, table.entryDate.desc(), table.id.desc()),
    index("trips_user_country_entry_idx").on(table.userId, table.countryCode, table.entryDate),
  ],
);

/**
 * Development only: signs initData with BOT_TOKEN so the Mini App can be opened in a regular
 * browser. Writes VITE_DEV_INIT_DATA to apps/mini-app/.env.development.local (git-ignored).
 * The value expires after INIT_DATA_MAX_AGE_SECONDS, like real Telegram data.
 *
 * Usage: npm run dev:init-data [-- <telegram user id>]
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { buildDataCheckString, computeInitDataHash } from "../src/lib/telegram-init-data";

const botToken = process.env.BOT_TOKEN;
if (!botToken) {
  throw new Error("BOT_TOKEN is required (set it in .env)");
}

const telegramId = Number(process.argv[2] ?? 1);
if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
  throw new Error("Telegram user id must be a positive integer");
}

const fields = new Map([
  ["user", JSON.stringify({ id: telegramId, first_name: "Dev" })],
  ["auth_date", String(Math.floor(Date.now() / 1000))],
]);
const hash = computeInitDataHash(buildDataCheckString(fields), botToken);
const initData = new URLSearchParams([...fields, ["hash", hash]]).toString();

const target = path.resolve(import.meta.dirname, "../../mini-app/.env.development.local");
writeFileSync(target, `VITE_DEV_INIT_DATA="${initData}"\n`);
console.log(`Signed initData for Telegram user ${telegramId} written to ${target}`);

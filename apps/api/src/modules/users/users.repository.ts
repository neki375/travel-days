import { eq } from "drizzle-orm";
import type { Database } from "../../db/client";
import { users } from "../../db/schema";

export interface UserRecord {
  id: string;
  telegramId: number;
}

const userColumns = { id: users.id, telegramId: users.telegramId };

async function findByTelegramId(db: Database, telegramId: number): Promise<UserRecord | undefined> {
  const [user] = await db.select(userColumns).from(users).where(eq(users.telegramId, telegramId));
  return user;
}

/**
 * Returns the user for a Telegram id, creating it on first use.
 * Safe under concurrent first requests: the unique telegram_id resolves the race.
 */
export async function findOrCreateUserByTelegramId(
  db: Database,
  telegramId: number,
): Promise<UserRecord> {
  const existing = await findByTelegramId(db, telegramId);
  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(users)
    .values({ telegramId })
    .onConflictDoNothing({ target: users.telegramId })
    .returning(userColumns);
  if (created) {
    return created;
  }

  // Another request inserted the same user between our select and insert.
  const concurrent = await findByTelegramId(db, telegramId);
  if (!concurrent) {
    throw new Error("User not found after insert conflict");
  }
  return concurrent;
}

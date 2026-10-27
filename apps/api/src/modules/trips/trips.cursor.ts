import { isoDateSchema } from "@travel-days/shared";
import { z } from "zod";

/** Position after the last trip of a page in the (entryDate DESC, id DESC) order. */
export interface TripsCursor {
  entryDate: string;
  id: string;
}

const cursorSchema = z.tuple([isoDateSchema, z.uuid()]);

export function encodeTripsCursor(cursor: TripsCursor): string {
  return Buffer.from(JSON.stringify([cursor.entryDate, cursor.id])).toString("base64url");
}

/** Returns null for anything that is not a cursor produced by encodeTripsCursor. */
export function decodeTripsCursor(value: string): TripsCursor | null {
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString()));
    return parsed.success ? { entryDate: parsed.data[0], id: parsed.data[1] } : null;
  } catch {
    return null;
  }
}

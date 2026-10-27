import type { CreateTripInput, Trip } from "@travel-days/shared";
import type { Database, Transaction } from "../../db/client";
import { getPgError } from "../../lib/db-errors";
import {
  openTripExists,
  tripAlreadyClosed,
  tripNotFound,
  tripOverlap,
  validationError,
  type AppError,
} from "../../lib/errors";
import { calculateTripDays } from "./day-calculator";
import { findConflict, validateTripDates, type DateSpan, type TripDatesIssue } from "./trip-rules";
import {
  countryExists,
  findTripsTouchingSpan,
  findUserTrip,
  insertTrip,
  lockUser,
  setTripExitDate,
  type TripRow,
} from "./trips.repository";

export type TripsService = ReturnType<typeof createTripsService>;

/**
 * Trip writes run in a transaction that first locks the user row, so the open-trip and
 * overlap checks cannot race with another write of the same user (SPEC.md §5, §10.1).
 * `today` is the user's current date, computed by the caller on the server.
 */
export function createTripsService(db: Database) {
  async function inUserTransaction<T>(
    userId: string,
    work: (tx: Transaction) => Promise<T>,
  ): Promise<T> {
    try {
      return await db.transaction(
        async (tx) => {
          await lockUser(tx, userId);
          return work(tx);
        },
        { isolationLevel: "read committed" },
      );
    } catch (error) {
      throw constraintViolationToAppError(error) ?? error;
    }
  }

  return {
    /** Check-in (no exitDate) or a closed historical trip (with exitDate). */
    async create(userId: string, input: CreateTripInput, today: string): Promise<Trip> {
      const span: DateSpan = { entryDate: input.entryDate, exitDate: input.exitDate ?? null };
      assertValidDates(span, today);

      return inUserTransaction(userId, async (tx) => {
        if (!(await countryExists(tx, input.countryCode))) {
          throw validationError("Unknown country code", [
            { path: "countryCode", message: "Unknown country code" },
          ]);
        }

        await assertNoConflicts(tx, userId, span);

        const tripId = await insertTrip(tx, { userId, countryCode: input.countryCode, ...span });
        return toTrip(await requireUserTrip(tx, userId, tripId), today);
      });
    },

    async checkout(userId: string, tripId: string, exitDate: string, today: string) {
      return inUserTransaction(userId, async (tx) => {
        const trip = await requireUserTrip(tx, userId, tripId);
        if (trip.exitDate !== null) {
          throw tripAlreadyClosed();
        }

        // Closing an open trip only shortens it, so it cannot create a new overlap.
        assertValidDates({ entryDate: trip.entryDate, exitDate }, today);
        await setTripExitDate(tx, tripId, exitDate);

        return toTrip({ ...trip, exitDate }, today);
      });
    },
  };
}

async function assertNoConflicts(
  tx: Transaction,
  userId: string,
  span: DateSpan,
  excludeTripId?: string,
): Promise<void> {
  const candidates = await findTripsTouchingSpan(tx, userId, span, excludeTripId);

  // An open trip extends to +∞, so any existing open trip is among the candidates.
  if (span.exitDate === null && candidates.some((trip) => trip.exitDate === null)) {
    throw openTripExists();
  }
  if (findConflict(span, candidates)) {
    throw tripOverlap();
  }
}

async function requireUserTrip(tx: Transaction, userId: string, tripId: string) {
  const trip = await findUserTrip(tx, userId, tripId);
  if (!trip) {
    throw tripNotFound();
  }
  return trip;
}

const DATE_ISSUES: Record<TripDatesIssue, { path: string; message: string }> = {
  INVALID_DATE: { path: "", message: "Invalid date" },
  DATE_TOO_EARLY: { path: "entryDate", message: "Dates before 1900-01-01 are not supported" },
  ENTRY_IN_FUTURE: { path: "entryDate", message: "Entry date cannot be in the future" },
  EXIT_IN_FUTURE: { path: "exitDate", message: "Exit date cannot be in the future" },
  EXIT_BEFORE_ENTRY: { path: "exitDate", message: "Exit date cannot be before entry date" },
};

function assertValidDates(span: DateSpan, today: string): void {
  const issue = validateTripDates(span, today);
  if (issue) {
    const { path, message } = DATE_ISSUES[issue];
    throw validationError(message, [{ path, message }]);
  }
}

/** Database backstops (SPEC.md §10.1) surface as the same 409 errors as the service checks. */
function constraintViolationToAppError(error: unknown): AppError | undefined {
  const pgError = getPgError(error);
  if (pgError?.constraint === "trips_one_open_per_user") {
    return openTripExists();
  }
  if (pgError?.constraint === "trips_no_overlap") {
    return tripOverlap();
  }
  return undefined;
}

export function toTrip(row: TripRow, today: string): Trip {
  return {
    id: row.id,
    country: { code: row.countryCode, name: row.countryName },
    entryDate: row.entryDate,
    exitDate: row.exitDate,
    days: calculateTripDays(row.entryDate, row.exitDate, today),
    isOpen: row.exitDate === null,
  };
}

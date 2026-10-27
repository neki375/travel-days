import {
  checkoutTripBodySchema,
  createTripBodySchema,
  tripIdParamsSchema,
  type Trip,
} from "@travel-days/shared";
import type { FastifyInstance } from "fastify";
import type { Clock } from "../../lib/clock";
import { parseInput } from "../../lib/validation";
import { requestToday } from "../../plugins/time-zone";
import type { TripsService } from "./trips.service";

export interface TripsRoutesOptions {
  tripsService: TripsService;
  clock: Clock;
}

export function tripsRoutes(app: FastifyInstance, { tripsService, clock }: TripsRoutesOptions) {
  app.post("/trips", async (request, reply): Promise<Trip> => {
    const body = parseInput(createTripBodySchema, request.body);
    const trip = await tripsService.create(request.authUser.id, body, requestToday(request, clock));
    return reply.status(201).send(trip);
  });

  app.post("/trips/:id/checkout", async (request): Promise<Trip> => {
    const { id } = parseInput(tripIdParamsSchema, request.params);
    const { exitDate } = parseInput(checkoutTripBodySchema, request.body);
    return tripsService.checkout(request.authUser.id, id, exitDate, requestToday(request, clock));
  });
}

import {
  checkoutTripBodySchema,
  createTripBodySchema,
  listTripsQuerySchema,
  tripIdParamsSchema,
  updateTripBodySchema,
  type CurrentTripResponse,
  type ListTripsResponse,
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
  app.get("/trips", async (request): Promise<ListTripsResponse> => {
    const query = parseInput(listTripsQuerySchema, request.query);
    return tripsService.list(request.authUser.id, query, requestToday(request, clock));
  });

  app.get("/trips/current", async (request): Promise<CurrentTripResponse> => {
    return tripsService.current(request.authUser.id, requestToday(request, clock));
  });

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

  app.patch("/trips/:id", async (request): Promise<Trip> => {
    const { id } = parseInput(tripIdParamsSchema, request.params);
    const body = parseInput(updateTripBodySchema, request.body);
    return tripsService.update(request.authUser.id, id, body, requestToday(request, clock));
  });

  app.delete("/trips/:id", async (request, reply) => {
    const { id } = parseInput(tripIdParamsSchema, request.params);
    await tripsService.delete(request.authUser.id, id);
    return reply.status(204).send();
  });
}

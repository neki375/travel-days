import { statisticsQuerySchema, type StatisticsResponse } from "@travel-days/shared";
import type { FastifyInstance } from "fastify";
import type { Clock } from "../../lib/clock";
import { parseInput } from "../../lib/validation";
import { requestToday } from "../../plugins/time-zone";
import type { StatisticsService } from "./statistics.service";

export interface StatisticsRoutesOptions {
  statisticsService: StatisticsService;
  clock: Clock;
}

export function statisticsRoutes(
  app: FastifyInstance,
  { statisticsService, clock }: StatisticsRoutesOptions,
) {
  app.get("/statistics", async (request): Promise<StatisticsResponse> => {
    const query = parseInput(statisticsQuerySchema, request.query);
    return statisticsService.get(request.authUser.id, query, requestToday(request, clock));
  });
}

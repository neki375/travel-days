import type { FastifyInstance } from "fastify";
import { AppError, errorBody } from "../lib/errors";

/** Sends every error in the unified format (SPEC.md §4.8, §10.6). */
export function registerErrorHandlers(app: FastifyInstance): void {
  app.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .send(errorBody(error.code, error.message, error.details));
    }

    // Fastify's own client errors: malformed JSON, unsupported media type, body too large.
    const statusCode = getStatusCode(error);
    if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
      const message = error instanceof Error ? error.message : "Bad request";
      return reply.status(statusCode).send(errorBody("VALIDATION_ERROR", message));
    }

    request.log.error({ err: error }, "unhandled error");
    return reply.status(500).send(errorBody("INTERNAL_ERROR", "Internal server error"));
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send(errorBody("NOT_FOUND", "Route not found")),
  );
}

function getStatusCode(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    return typeof error.statusCode === "number" ? error.statusCode : undefined;
  }
  return undefined;
}

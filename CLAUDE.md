# Project Instructions — Travel Days

## Project

Telegram Mini App for tracking the number of days spent in different countries.

The complete requirements are in `SPEC.md`. Treat `SPEC.md` as the source of truth.

## Technology stack

* Node.js LTS
* TypeScript with strict mode
* React + Vite
* Fastify
* PostgreSQL
* Drizzle ORM
* Zod
* grammY
* Vitest
* Docker Compose

## Architecture

* Use a modular monolith.
* Separate routes, services, repositories, schemas and domain logic.
* Keep date calculation logic independent of HTTP, Telegram and the database.
* Use shared types where appropriate.
* Avoid unnecessary abstractions and dependencies.

## Business rules

* Both entry and exit dates count as days spent in a country.
* An open trip has `exit_date = NULL`.
* A user may have at most one open trip.
* Trips belonging to the same user must not overlap; only a boundary day may be shared (exit from A and entry to B on the same date). See "Уточнения MVP" in `SPEC.md`.
* Store travel dates as PostgreSQL DATE values.
* Calculate statistics from trips instead of storing redundant day counters.
* Never trust Telegram user data without server-side initData validation.
* Never allow a user to access another user's trips.

## Development workflow

1. Read `SPEC.md` before implementing features.
2. Work in small, independently testable increments.
3. Before each stage, explain the proposed changes and files affected.
4. After implementation, run relevant tests, type checks and linting.
5. Fix failures before moving to the next stage.
6. Update documentation when API contracts or architecture change.
7. Do not silently change requirements. Ask if a requirement is ambiguous.
8. Never claim a test passed unless it was actually executed.

## Git

* Do not add `Co-Authored-By` trailers or any other AI attribution to commit messages and pull request descriptions.
* The default branch is `master`.

## Security

* Keep bot tokens, database credentials and other secrets in environment variables.
* Never commit secrets.
* Validate all API input on the server.
* Apply ownership checks to every trip operation.
* Use database transactions for operations that enforce trip constraints.

## Scope

Implement the MVP defined in `SPEC.md` first.
Do not implement subscriptions, geolocation, immigration rule engines or other post-MVP features unless explicitly requested.

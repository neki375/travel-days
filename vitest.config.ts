import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "shared",
          root: "packages/shared",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "api-unit",
          root: "apps/api",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "mini-app",
          root: "apps/mini-app",
          include: ["src/**/*.test.ts"],
          // A zone west of UTC exposes `new Date("YYYY-MM-DD")` day shifts.
          env: { TZ: "America/Los_Angeles" },
        },
      },
      {
        test: {
          name: "api-integration",
          root: "apps/api",
          include: ["test/**/*.test.ts"],
          globalSetup: ["test/global-setup.ts"],
          // Test files share one database.
          fileParallelism: false,
          // A zone east of UTC exposes calendar-day shifts from Date conversions.
          env: { TZ: "Asia/Manila" },
        },
      },
    ],
  },
});

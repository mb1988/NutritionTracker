import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";

// With a config file present, the Prisma CLI no longer reads `.env` itself.
// Railway injects variables directly; locally we load `.env` when it exists.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
});

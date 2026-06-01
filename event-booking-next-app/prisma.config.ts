// Prisma 7 config. Connection URLs live here instead of schema.prisma.
//
// We point Migrate at DIRECT_URL (port 5432, no pgBouncer) because
// prisma migrate needs to manage transactions, run DDL, and use advisory
// locks - all of which fail through Supabase's transaction pooler.
//
// Runtime queries from the Next.js app go through DATABASE_URL (port 6543,
// pooler) via the PrismaPg adapter configured in src/lib/prisma.ts.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"]!,
  },
});

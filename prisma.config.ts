import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    // directUrl used for migrations (bypasses PgBouncer)
    ...(process.env["DIRECT_URL"] ? { directUrl: process.env["DIRECT_URL"] } : {}),
  },
})

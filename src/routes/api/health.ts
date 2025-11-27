import { createFileRoute } from "@tanstack/react-router";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { log } from "../../utils/logger";

export const Route = createFileRoute("/api/health")({
  component: () => null,
  server: {
    handlers: {
      GET: async () => {
        try {
          // Check database connection
          await db.execute(sql`SELECT 1`);

          return Response.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            database: "connected",
          });
        } catch (error) {
          log.error("Health check failed", error);
          return Response.json(
            {
              status: "unhealthy",
              timestamp: new Date().toISOString(),
              database: "disconnected",
              error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 503 }
          );
        }
      },
    },
  },
});

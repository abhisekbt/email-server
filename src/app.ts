import cors from "cors";
import express from "express";

import { env } from "./config/env";
import { pool } from "./db/pool";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { authRouter } from "./routes/auth.routes";
import { categoriesRouter } from "./routes/categories.routes";
import { communicationsRouter } from "./routes/communications.routes";
import { companiesRouter } from "./routes/companies.routes";
import { smtpRouter } from "./routes/smtp.routes";
import { templatesRouter } from "./routes/templates.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Production health check with dual database diagnostics
  app.get("/api/health", async (_req, res) => {
    try {
      const diagnostics = await pool.getDiagnostics();
      const isHealthy = diagnostics.primary.status === "connected" || diagnostics.supabaseFallback.status === "connected";

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? "healthy" : "unhealthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: diagnostics,
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.use("/api/auth", authRouter);
  app.use("/api/companies", companiesRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/email-templates", templatesRouter);
  app.use("/api/communications", communicationsRouter);
  app.use("/api/smtp-config", smtpRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

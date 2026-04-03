// Definitive Solution: Vercel Native API Entry Point
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers.js";
import { createContext } from "../server/_core/context.js";
import { registerWebhookRoutes } from "../server/mp-webhook.js";
import { registerOAuthRoutes } from "../server/_core/oauth.js";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// 1. Diagnostics (Priority 1)
app.get("/api/ping", (_req, res) => {
  res.json({ 
    status: "ok", 
    mode: "vercel-unified", 
    timestamp: new Date().toISOString() 
  });
});

app.get("/api/db-test", async (_req, res) => {
  try {
    const { getDb } = await import("../server/db.js");
    const { sql } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return res.status(503).json({ status: "error", message: "DB not available" });
    const result = await db.execute(sql`SELECT 1 as connected`);
    res.json({ status: "connected", result });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// 2. Project Routes (TRPC, Webhooks, OAuth)
const apiRouter = express.Router();
registerOAuthRoutes(apiRouter);
registerWebhookRoutes(apiRouter);

apiRouter.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.use("/api", apiRouter);

// Handle root calls by redirecting / (Vercel static takes or this handles it as fallback)
app.get("/", (_req, res) => {
  res.send("API Server OK - Independent Brand established.");
});

export default app;

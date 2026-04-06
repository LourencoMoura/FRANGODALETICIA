// ULTRA-ISOLATED Vercel Entry Point (Diagnostic Mode)
import express from "express";

const app = express();
app.use(express.json());

// 1. HIGH-PRIORITY PING (Always works)
app.get("/api/ping", (_req, res) => {
  res.json({ 
    status: "ok", 
    mode: "ultra-isolated", 
    timestamp: new Date().toISOString(),
    node_version: process.version
  });
});

// 2. DYNAMICALLY LOAD THE PROJECT
app.all("/api/*", async (req, res) => {
  try {
    const { createExpressMiddleware } = await import("@trpc/server/adapters/express");
    const { appRouter } = await import("../server/routers.js");
    const { createContext } = await import("../server/_core/context.js");
    const { registerWebhookRoutes } = await import("../server/mp-webhook.js");
    const { registerOAuthRoutes } = await import("../server/_core/oauth.js");

    const apiRouter = express.Router();
    registerOAuthRoutes(apiRouter);
    registerWebhookRoutes(apiRouter);

    apiRouter.use(
      "/trpc",
      createExpressMiddleware({
        router: appRouter,
        createContext: (opts) => createContext({ ...opts, req: opts.req, res: opts.res }),
      })
    );

    // Vercel routes /api/* to this file.
    // We must remove the "/api" prefix for the sub-router to work correctly.
    const originalUrl = req.url;
    if (req.url.startsWith("/api")) {
      req.url = req.url.replace("/api", "") || "/";
    }

    return apiRouter(req, res, () => {
       res.status(404).json({ 
         error: "Route not found in API router", 
         originalUrl,
         tryingPath: req.url 
       });
    });
  } catch (err: any) {
    console.error("[Vercel Runtime Error]:", err.message);
    res.status(500).json({ 
      error: "API_LOAD_FAILURE", 
      message: err.message,
      stack: err.stack 
    });
  }
});

// Fallback
app.get("*", (_req, res) => {
  res.status(200).send("Frango da Letícia API - Standby");
});

export default app;

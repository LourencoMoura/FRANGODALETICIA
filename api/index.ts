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
    // We import the complex logic ONLY when needed
    // This prevents the whole function from crashing if one file has an import error
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
        createContext: (opts) => createContext({ ...opts, req, res }),
      })
    );

    // Use the apiRouter at the /api path. 
    // This allows Express to handle the "/api" part of the URL 
    // before it gets to the sub-routes like "/trpc"
    app.use("/api", apiRouter);

    // Continue the routing
    return apiRouter(req, res, () => {
       res.status(404).json({ error: "Route not found in sub-router", url: req.url });
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

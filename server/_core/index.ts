import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { sql } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
// Removidos imports estáticos de vite.js para evitar erro de inicialização na Vercel
import { registerWebhookRoutes } from "../mp-webhook.js";
import { registerOAuthRoutes } from "./oauth.js";
import { appRouter } from "../routers.js";
import { createContext } from "./context.js";

// Global Exception Loggers for Vercel Debugging
process.on("uncaughtException", err => {
  console.error("[CRITICAL] Uncaught Exception:", err.message, err.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "[CRITICAL] Unhandled Rejection at:",
    promise,
    "reason:",
    reason
  );
});

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

const app = express();

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API Router to handle /api/* routes
const apiRouter = express.Router();

// Global Health Check (Diagnostics) - Fully independent to debug connectivity
apiRouter.get("/ping", (_req, res) => {
  console.log("[Diagnostics] Ping request received.");
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    db_configured: !!process.env.DATABASE_URL,
    deployment: process.env.VERCEL ? "vercel" : "standalone",
    version: "1.1.1" 
  });
});

apiRouter.get("/db-test", async (_req, res) => {
  console.log("[Diagnostics] Manual DB test requested.");
  try {
    const { getDb } = await import("../db.js");
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ 
        status: "error", 
        message: "Banco de dados não configurado ou indisponível." 
      });
    }
    // Simple query to verify connection
    const result = await db.execute(sql`SELECT 1 as connected`);
    res.json({ status: "connected", result });
  } catch (err: any) {
    console.error("[Diagnostics] DB Test Failed:", err);
    res.status(500).json({ 
      status: "error", 
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
});

console.log("[Lifecycle] Registering routes...");
// OAuth callback & Webhooks on the API router
registerOAuthRoutes(apiRouter);
registerWebhookRoutes(apiRouter);

console.log("[Lifecycle] Setting up routes and tRPC...");

// tRPC API setup - mounted directly on apiRouter
apiRouter.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Mount API router
// Support both prefixed and non-prefixed calls for maximum resilience in Vercel
app.use("/api", apiRouter);
app.use("/", apiRouter);

// Global Error Handler for API routes (Rescue)
apiRouter.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(`[API ERROR] ${req.method} ${req.url}:`, err);
    res.status(500).json({
      error: {
        message: "Ocorreu um erro interno no servidor.",
        code: "INTERNAL_SERVER_ERROR",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      },
    });
  }
);

async function startServer() {
  console.log(`[Lifecycle] STARTING BOOT... VERCEL: ${!!process.env.VERCEL}`);
  const server = createServer(app);

  // development mode uses Vite, production mode uses static files
  if (!process.env.VERCEL && process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./vite.js");
    serveStatic(app);
  }

  // Only listen on a port if we're not running in a Serverless environment (like Vercel)
  if (!process.env.VERCEL) {
    const preferredPort = parseInt(process.env.PORT || "3000");
    const port = await findAvailablePort(preferredPort);

    if (port !== preferredPort) {
      console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }

    server.listen(port, async () => {
      console.log(`Server running on http://localhost:${port}/`);
      // Initialize reminders for pending orders - Dynamic import to keep production bundle lean
      try {
        const { initializeReminders } = await import("../reminder-scheduler.js");
        await initializeReminders();
      } catch (err) {
        console.error("[Reminders] Failed to initialize:", err);
      }
    });
  } else {
    console.log("[Vercel] Booting in serverless mode. Background tasks disabled.");
    // No Vercel, não iniciamos schedulers via setTimeout pois a execução é efêmera.
  }
}

// Global Startup protection
if (!process.env.VERCEL) {
  try {
    startServer().catch(err => {
      console.error("[CRITICAL] Failed to start server:", err);
    });
  } catch (err) {
    console.error("[CRITICAL] Fatal error during startup sequence:", err);
  }
} else {
  // Em ambiente Vercel, apenas registramos as rotas estáticas (fallback) em modo síncrono
  // O Vite NUNCA deve ser importado aqui.
  import("./vite.js").then(({ serveStatic }) => serveStatic(app)).catch(console.error);
}

export default app;

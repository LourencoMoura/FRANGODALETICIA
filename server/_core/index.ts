import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { serveStatic, setupVite } from "./vite.js";
import { initializeReminders } from "../reminder-scheduler.js";
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

// Global Health Check (Diagnostics)
apiRouter.get("/ping", (_req, res) => {
  console.log("[Diagnostics] Ping request received.");
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    has_db_url: !!process.env.DATABASE_URL,
    platform: process.env.VERCEL ? "vercel" : "local",
  });
});

apiRouter.get("/db-test", async (_req, res) => {
  try {
    const { getDb } = await import("../db.js");
    const db = await getDb();
    if (!db) throw new Error("Banco de dados não disponível.");
    res.json({ status: "connected" });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

console.log("[Lifecycle] Registering routes...");
// OAuth callback & Webhooks on the API router
registerOAuthRoutes(apiRouter);
registerWebhookRoutes(apiRouter);

console.log("[Lifecycle] Setting up tRPC...");
// tRPC API on the API router
apiRouter.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Mount API router
// On Vercel, we mount it at BOTH '/' and '/api' to be absolutely resilient
// to how Vercel and the rewrites handle the incoming path.
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
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Only listen on a port if we're not running in a Serverless environment (like Vercel)
  if (!process.env.VERCEL) {
    const preferredPort = parseInt(process.env.PORT || "3000");
    const port = await findAvailablePort(preferredPort);

    if (port !== preferredPort) {
      console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }

    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}/`);
      // Initialize reminders for pending orders
      initializeReminders().catch(console.error);
    });
  } else {
    // In Serverless, we still need to initialize reminders once if possible
    console.log("[Vercel] Booting in serverless mode...");
    initializeReminders().catch(err =>
      console.error("[Reminders] Failed to initialize on boot:", err)
    );
  }
}

startServer().catch(console.error);

export default app;

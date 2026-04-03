import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { serveStatic, setupVite } from "./vite";
import { initializeReminders } from "../reminder-scheduler";
import { registerWebhookRoutes } from "../mp-webhook";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

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

async function startServer() {
  console.log(`[Lifecycle] [V1.1.4] STARTING BOOT... ENV: ${process.env.NODE_ENV || 'prod'}`);
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  console.log("[Lifecycle] Registering routes...");
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Mercado Pago Webhook
  registerWebhookRoutes(app);
  
  console.log("[Lifecycle] Setting up tRPC...");
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Global Error Handler for API routes (Rescue)
  app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[API ERROR] ${req.method} ${req.url}:`, err);
    res.status(500).json({
      error: {
        message: "Ocorreu um erro interno no servidor.",
        code: "INTERNAL_SERVER_ERROR",
        details: process.env.NODE_ENV === "development" ? err.message : undefined
      }
    });
  });

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
    initializeReminders().catch(err => console.error("[Reminders] Failed to initialize on boot:", err));
  }
}

startServer().catch(console.error);

export default app;

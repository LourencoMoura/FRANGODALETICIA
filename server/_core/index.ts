import "dotenv/config";
import express from "express";
import { sql } from "drizzle-orm";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// 1. Definição do App e Rota de Diagnóstico Imediata (Resiliência Total)
const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Rota de diagnóstico de alta prioridade para Vercel
app.get("/api/ping", (_req, res) => {
  res.json({
    status: "ok",
    version: "1.3.0",
    deployment: "independent-final",
    timestamp: new Date().toISOString()
  });
});

// 2. Importações de Rotas e Lógica de Negócio
import { registerWebhookRoutes } from "../mp-webhook.js";
import { registerOAuthRoutes } from "./oauth.js";
import { appRouter } from "../routers.js";
import { createContext } from "./context.js";

// API Router to handle /api/* routes
const apiRouter = express.Router();

apiRouter.get("/db-test", async (_req, res) => {
  try {
    const { getDb } = await import("../db.js");
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ 
        status: "error", 
        message: "Banco de dados não configurado ou indisponível." 
      });
    }
    const result = await db.execute(sql`SELECT 1 as connected`);
    res.json({ status: "connected", result });
  } catch (err: any) {
    res.status(500).json({ 
      status: "error", 
      message: err.message 
    });
  }
});

// Registrar rotas de terceiros (Mercado Pago, Auth, etc)
registerOAuthRoutes(apiRouter);
registerWebhookRoutes(apiRouter);

// Configuração do tRPC
apiRouter.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Montar roteador de API
app.use("/api", apiRouter);

// 3. Suporte para Ambiente de Desenvolvimento (Vite)
const isVercel = !!process.env.VERCEL;

if (!isVercel) {
  // Inicialização dinâmica do Vite apenas em desenvolvimento local
  (async () => {
    try {
      const { setupVite, serveStatic } = await import("./vite.js");
      if (process.env.NODE_ENV !== "production") {
        await setupVite(app);
      } else {
        serveStatic(app);
      }
    } catch (e) {
      console.warn("[Vite] Carregamento ignorado (ambiente de produção ou build ausente)");
    }
  })();
}

// 4. Inicialização do Servidor (Apenas se não estiver na Vercel)
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
    if (await isPortAvailable(port)) return port;
  }
  return startPort;
}

async function startServer() {
  const port = await findAvailablePort(Number(process.env.PORT) || 3000);
  const server = createServer(app);
  server.listen(port, "0.0.0.0", () => {
    console.log(`[Server] Rodando em http://localhost:${port}`);
  });
}

if (!isVercel) {
  startServer();
}

// 5. Exportação para Vercel
export default app;

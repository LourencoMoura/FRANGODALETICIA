import type { Express } from "express";

export function registerOAuthRoutes(app: Express) {
  // OAuth do sistema antigo desativado em favor da autenticação local.
  // Se futuramente for necessário Social Login (Google/Apple), 
  // a implementação deve ser feita aqui de forma independente.
  app.get("/api/oauth/callback", (req, res) => {
    console.warn("[Auth] Tentativa de acesso a rota OAuth legada.");
    res.status(410).json({ error: "Este método de login foi desativado em favor da autenticação local." });
  });
}

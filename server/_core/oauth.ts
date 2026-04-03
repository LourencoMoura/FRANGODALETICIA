import { Router, Request, Response } from "express";

export function registerOAuthRoutes(router: Router) {
  // OAuth do sistema antigo desativado em favor da autenticação local.
  // Se futuramente for necessário Social Login (Google/Apple),
  // a implementação deve ser feita aqui de forma independente.
  router.get("/oauth/callback", (req: Request, res: Response) => {
    console.warn("[Auth] Tentativa de acesso a rota OAuth legada.");
    res
      .status(410)
      .json({
        error:
          "Este método de login foi desativado em favor da autenticação local.",
      });
  });
}

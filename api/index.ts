// Vercel Entry Point - Resiliência Máxima
import express from "express";

export default async function handler(req: express.Request, res: express.Response) {
  // Rota de ping isolada que não depende de nada do projeto
  if (req.url?.includes("/ping")) {
    return res.json({ status: "ok", mode: "isolated-ping", timestamp: new Date().toISOString() });
  }

  try {
    // Carregamento dinâmico para evitar crash no boot da função
    const { default: app } = await import("../server/_core/index.js");
    return app(req, res);
  } catch (err: any) {
    console.error("[Vercel Boot Error]:", err.message);
    return res.status(500).json({ 
      error: "FUNCTION_BOOT_FAILED", 
      message: err.message,
      stack: err.stack 
    });
  }
}

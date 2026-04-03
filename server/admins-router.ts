import { router, publicProcedure } from "./_core/trpc.js";
import { z } from "zod";
import { getAdminByEmail, setAdminResetToken, updateAdminPassword, upsertUser } from "./db.js";
// @ts-ignore
import bcrypt from "bcryptjs";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { sdk } from "./_core/sdk.js";

export const adminsRouter = router({
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const admin = await getAdminByEmail(input.email);
      
      if (!admin) {
        throw new Error("Usuário ou senha inválidos");
      }
      
      const isValid = await bcrypt.compare(input.password, admin.senhaHash);
      
      if (!isValid) {
        throw new Error("Usuário ou senha inválidos");
      }
      
      const openId = `admin:${admin.id}`;
      
      // Sincronizar com a tabela unificada de Users para que o tRPC Context funcione
      await upsertUser({
        openId: openId,
        name: "Admin",
        email: admin.email,
        role: "admin",
        lastSignedIn: new Date(),
      });

      // Criar token de sessão (JWT Local)
      const sessionToken = await sdk.createSessionToken(openId, {
        name: "Admin",
        expiresInMs: ONE_YEAR_MS,
      });

      // Definir Cookie no Navegador
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { 
        ...cookieOptions, 
        maxAge: ONE_YEAR_MS,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });
      
      return {
        success: true,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        }
      };
    }),

  requestPasswordReset: publicProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      const admin = await getAdminByEmail(input.email);
      
      if (!admin) {
        // Don't reveal if admin exists for security, just say we sent the code
        return { success: true };
      }
      
      // Generate a 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      await setAdminResetToken(admin.email, code, expires);
      
      // Since we don't have SMTP, we return the code to the frontend 
      // where it will be used to generate a WhatsApp link for the admin
      return {
        success: true,
        whatsapp: admin.whatsapp,
        resetToken: code, // In a real system, never return the token here
      };
    }),

  resetPassword: publicProcedure
    .input(z.object({
      email: z.string().email(),
      token: z.string().length(6),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const admin = await getAdminByEmail(input.email);
      
      if (!admin || admin.resetToken !== input.token || !admin.resetExpires || admin.resetExpires < new Date()) {
        throw new Error("Código inválido ou expirado");
      }
      
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(input.newPassword, salt);
      
      await updateAdminPassword(admin.id, hash);
      
      // Clear token
      await setAdminResetToken(admin.email, "", new Date(0));
      
      return { success: true };
    }),
});

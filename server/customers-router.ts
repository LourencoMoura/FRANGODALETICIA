import { publicProcedure, router, adminProcedure } from './_core/trpc.js';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { customers } from '../drizzle/schema.js';
import { getDb, upsertUser } from './db.js';
import { TRPCError } from '@trpc/server';
import { sdk } from './_core/sdk.js';
import { COOKIE_NAME, ONE_YEAR_MS } from '../shared/const.js';
import { getSessionCookieOptions } from './_core/cookies.js';

export const customersRouter = router({
  // Login with WhatsApp
  login: publicProcedure
    .input(z.object({ whatsapp: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: "Database not available" });
        
        const result = await db.select().from(customers).where(eq(customers.whatsapp, input.whatsapp)).limit(1);
        
        if (result.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente não encontrado' });
        }
        
        const customer = result[0];
        const openId = `customer:${customer.id}`;

        // Sincronizar com a tabela unificada de Users para contexto tRPC
        await upsertUser({
          openId,
          name: customer.nome,
          role: 'user',
          lastSignedIn: new Date(),
        });

        // Criar token de sessão
        const sessionToken = await sdk.createSessionToken(openId, {
          name: customer.nome,
          expiresInMs: ONE_YEAR_MS,
        });

        // Definir Cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { 
          ...cookieOptions, 
          maxAge: ONE_YEAR_MS,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        });

        return { success: true, customer };
      } catch (error) {
        console.error('Error logging in customer:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao autenticar cliente' });
      }
    }),

  // Signup new customer
  signup: publicProcedure
    .input(z.object({
      whatsapp: z.string(),
      nome: z.string(),
      apelido: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        console.log(`[Signup] Attempting signup for ${input.whatsapp}...`);
        const db = await getDb();
        if (!db) {
          console.error(`[Signup] Database instance was not initialized for ${input.whatsapp}`);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: "Conexão com o banco falhou." });
        }
        
        // 1. Check if already exists
        console.log(`[Signup] Checking existence for ${input.whatsapp}...`);
        const existing = await db.select().from(customers).where(eq(customers.whatsapp, input.whatsapp)).limit(1);
        
        if (existing.length > 0) {
          console.log(`[Signup] WhatsApp ${input.whatsapp} already exists.`);
          throw new TRPCError({ code: 'CONFLICT', message: 'Este WhatsApp já está cadastrado' });
        }

        // 2. Perform insert
        console.log(`[Signup] Inserting new customer: ${input.nome}...`);
        try {
          const [newCustomer] = await db.insert(customers).values({
            whatsapp: input.whatsapp,
            nome: input.nome,
            apelido: input.apelido,
            points: 0,
          }).returning();

          console.log(`[Signup] Success! ID: ${newCustomer.id}`);

          const openId = `customer:${newCustomer.id}`;
          
          // Sincronizar com a tabela unificada de Users
          await upsertUser({
            openId,
            name: newCustomer.nome,
            role: 'user',
            lastSignedIn: new Date(),
          });

          // Criar token de sessão automático após cadastro
          const sessionToken = await sdk.createSessionToken(openId, {
            name: newCustomer.nome,
            expiresInMs: ONE_YEAR_MS,
          });

          // Definir Cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { 
            ...cookieOptions, 
            maxAge: ONE_YEAR_MS,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
          });

          return { success: true, customer: newCustomer };
        } catch (dbError: any) {
          console.error(`[Signup] DB INSERT ERROR: ${dbError.message}`, dbError);
          // Fallback se o banco não retornar nada mas o insert funcionar (raro mas possível em pooling)
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Falha na gravação dos dados: ${dbError.message || 'Verifique sua conexão'}` 
          });
        }
      } catch (error: any) {
        console.error('[Signup] CRITICAL CATCH:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: error.message || 'Erro inesperado no servidor de cadastro' 
        });
      }
    }),

  // Get customer details by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const result = await db.select().from(customers).where(eq(customers.id, input.id)).limit(1);
        return result.length > 0 ? result[0] : null;
      } catch (error) {
        console.error('Error getting customer by id:', error);
        throw error;
      }
    }),
  
  // List all customers (admin only)
  list: adminProcedure
    .query(async () => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const result = await db.select().from(customers);
        return result;
      } catch (error) {
        console.error('Error listing customers:', error);
        throw error;
      }
    }),
});

import { publicProcedure, router } from './_core/trpc.js';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { customers } from '../drizzle/schema.js';
import { getDb } from './db.js';
import { TRPCError } from '@trpc/server';

export const customersRouter = router({
  // Login with WhatsApp
  login: publicProcedure
    .input(z.object({ whatsapp: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: "Database not available" });
        
        const result = await db.select().from(customers).where(eq(customers.whatsapp, input.whatsapp)).limit(1);
        
        if (result.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente não encontrado' });
        }
        
        return { success: true, customer: result[0] };
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
    .mutation(async ({ input }) => {
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
  
  // List all customers (admin)
  list: publicProcedure
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

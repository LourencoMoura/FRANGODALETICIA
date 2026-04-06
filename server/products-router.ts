import { router, publicProcedure } from "./_core/trpc.js";
import { z } from "zod";
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
} from "./db.js";
import { TRPCError } from "@trpc/server";

export const productsRouter = router({
  list: publicProcedure.query(async () => {
    return await getAllProducts();
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const product = await getProductById(input.id);
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Produto não encontrado",
        });
      }
      return product;
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        price: z.number().positive(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await createProduct({
        name: input.name,
        price: input.price.toString(),
        description: input.description || null,
      });

      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao criar produto",
        });
      }

      return result;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        price: z.number().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.price !== undefined) {
        updateData.price = data.price.toString();
      }

      const success = await updateProduct(id, updateData);

      if (!success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao atualizar produto",
        });
      }

      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const success = await deleteProduct(input.id);
      if (!success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao excluir produto",
        });
      }
      return { success: true };
    }),
});

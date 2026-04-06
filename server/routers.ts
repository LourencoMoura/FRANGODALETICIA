import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { systemRouter } from "./_core/systemRouter.js";
import { publicProcedure, router } from "./_core/trpc.js";
import { pushRouter } from "./push-router.js";
import { customersRouter } from "./customers-router.js";
import { promotionsRouter } from "./promotions-router.js";
import { ordersRouter } from "./orders-router.js";
import { paymentRouter } from "./payment-router.js";
import { z } from "zod";

import { adminsRouter } from "./admins-router.js";
import { settingsRouter } from "./settings-router.js";
import { productsRouter } from "./products-router.js";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    loginCustomer: customersRouter.login,
    signupCustomer: customersRouter.signup,
    loginAdmin: adminsRouter.login,
  }),
  admins: adminsRouter,
  push: pushRouter,
  customers: customersRouter,
  promotions: promotionsRouter,
  orders: ordersRouter,
  payment: paymentRouter,
  settings: settingsRouter,
  products: productsRouter,
});

export type AppRouter = typeof appRouter;

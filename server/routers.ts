import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { pushRouter } from "./push-router";
import { customersRouter } from "./customers-router";
import { promotionsRouter } from "./promotions-router";
import { ordersRouter } from "./orders-router";
import { paymentRouter } from "./payment-router";
import { z } from "zod";

import { adminsRouter } from "./admins-router";
import { settingsRouter } from "./settings-router";

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
});

export type AppRouter = typeof appRouter;

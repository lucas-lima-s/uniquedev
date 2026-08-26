import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "@fastify/type-provider-zod";
import Fastify, { type FastifyServerOptions } from "fastify";
import { verifyProxyIdentity } from "./plugins/proxy-identity.js";
import { accountsRoutes } from "./routes/accounts.js";
import { budgetsRoutes } from "./routes/budgets.js";
import { categoriesRoutes } from "./routes/categories.js";
import { connectionsRoutes } from "./routes/connections.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { healthRoutes } from "./routes/health.js";
import { investmentsRoutes } from "./routes/investments.js";
import { meRoutes } from "./routes/me.js";
import { purchasesRoutes } from "./routes/purchases.js";
import { recurringRoutes } from "./routes/recurring.js";
import { transactionsRoutes } from "./routes/transactions.js";
import { webhooksRoutes } from "./routes/webhooks.js";

export function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify({ logger: true, ...options }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(healthRoutes);
  app.register(webhooksRoutes);

  app.register(async (protectedScope) => {
    protectedScope.addHook("preHandler", verifyProxyIdentity);
    protectedScope.register(meRoutes);
    protectedScope.register(connectionsRoutes);
    protectedScope.register(accountsRoutes);
    protectedScope.register(transactionsRoutes);
    protectedScope.register(categoriesRoutes);
    protectedScope.register(budgetsRoutes);
    protectedScope.register(recurringRoutes);
    protectedScope.register(purchasesRoutes);
    protectedScope.register(investmentsRoutes);
    protectedScope.register(dashboardRoutes);
  });

  return app;
}

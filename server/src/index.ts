import "./config/env";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { patientRoutes } from "./modules/patients/routes";
import { referralRoutes } from "./modules/referrals/routes";
import { tripRoutes } from "./modules/trips/routes";
import {
  dashboardRoutes,
  notificationRoutes,
  settingsRoutes,
} from "./modules/dashboard/routes";
import { startNotificationWorker } from "./modules/notifications/service";
import { maybeStartWhatsApp } from "./modules/notifications/whatsapp";

export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get("/api/health", async () => ({ ok: true, time: new Date().toISOString() }));

  await app.register(patientRoutes);
  await app.register(referralRoutes);
  await app.register(tripRoutes);
  await app.register(dashboardRoutes);
  await app.register(notificationRoutes);
  await app.register(settingsRoutes);

  app.setErrorHandler((error: unknown, _req, reply) => {
    app.log.error(error);
    const message = error instanceof Error ? error.message : "Erro interno";
    reply.code(500).send({ error: message });
  });

  return app;
}

const port = Number(process.env.PORT || 3333);

const app = await buildApp();
startNotificationWorker();
maybeStartWhatsApp();

try {
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`API RotaSaude escutando em http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

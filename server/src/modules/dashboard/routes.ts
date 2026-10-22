import type { FastifyInstance } from "fastify";
import { db } from "../../lib/prisma";
import {
  NOTIFICATION_KIND_META,
  priorityScore,
} from "../../lib/domain";
import { spStartOfDay } from "../notifications/service";
import { isValidPhone } from "../../lib/phone";
import {
  checkWhatsAppNumber,
  getWhatsAppProviderStatus,
  sendWhatsApp,
} from "../notifications/whatsapp";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", async () => {
    const since30 = spStartOfDay(-30);
    const [statusCounts, atendidos30, faltas30, upcomingTrips, queue, recentNotifications, tripsToday] =
      await Promise.all([
        db.referral.groupBy({ by: ["status"], _count: { _all: true } }),
        db.referral.count({ where: { status: "ATENDIDO", queueSince: { gte: since30 } } }),
        db.referral.count({ where: { status: "FALTOU", queueSince: { gte: since30 } } }),
        db.trip.findMany({
          where: {
            OR: [
              { status: "EM_ROTA" },
              { status: "PLANEJADA", departureAt: { gte: new Date() } },
            ],
          },
          orderBy: { departureAt: "asc" },
          take: 20,
          include: { seats: { include: { referral: { include: { patient: true } } } } },
        }),
        db.referral.findMany({
          where: { status: "AGUARDANDO_VAGA" },
          include: { patient: true },
          orderBy: { queueSince: "asc" },
        }),
        db.notification.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
        db.trip.count({
          where: { departureAt: { gte: spStartOfDay(), lt: spStartOfDay(1) } },
        }),
      ]);

    const nextTrip = upcomingTrips[0] ?? null;
    const counts: Record<string, number> = {};
    for (const row of statusCounts) counts[row.status] = row._count._all;

    const totalDecisoes = atendidos30 + faltas30;
    const queueRanked = queue
      .map((r) => ({ ...r, score: priorityScore(r) }))
      .sort((a, b) => b.score - a.score);

    return {
      counts: {
        aguardando: counts.AGUARDANDO_VAGA || 0,
        confirmado: counts.CONFIRMADO || 0,
        emViagem: counts.EM_VIAGEM || 0,
        atendido: counts.ATENDIDO || 0,
        faltou: counts.FALTOU || 0,
        cancelado: counts.CANCELADO || 0,
      },
      absenteism: {
        atendidos30,
        faltas30,
        rate: totalDecisoes ? Math.round((faltas30 / totalDecisoes) * 100) : 0,
      },
      tripsToday,
      nextTrip,
      upcomingTrips,
      queue: queueRanked.slice(0, 8),
      recentNotifications: recentNotifications.map((n) => ({
        ...n,
        kindLabel: NOTIFICATION_KIND_META[n.kind]?.label || n.kind,
      })),
    };
  });
}

export async function notificationRoutes(app: FastifyInstance) {
  app.get("/api/notifications", async (req) => {
    const { status, search } = req.query as { status?: string; search?: string };
    const where: any = {};
    if (status) where.status = status;
    if (search)
      where.OR = [
        { patientName: { contains: search } },
        { to: { contains: search } },
        { message: { contains: search } },
      ];
    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { referral: { include: { patient: true } } },
    });
    return notifications.map((n) => ({
      ...n,
      kindLabel: NOTIFICATION_KIND_META[n.kind]?.label || n.kind,
    }));
  });

  app.get("/api/notifications/provider", async () => getWhatsAppProviderStatus());

  app.post("/api/notifications/check", async (req, reply) => {
    const body = (req.body || {}) as { to?: string };
    if (!body.to || !isValidPhone(body.to)) {
      return reply.code(400).send({ error: "Informe um telefone valido com DDD" });
    }
    return checkWhatsAppNumber(body.to);
  });

  app.post("/api/notifications/test", async (req, reply) => {
    const body = (req.body || {}) as { to?: string; message?: string };
    if (!body.to || !isValidPhone(body.to)) {
      return reply.code(400).send({ error: "Informe um telefone valido com DDD" });
    }

    const message =
      body.message?.trim() ||
      "Teste do Rota Saude: se voce recebeu esta mensagem, o envio de WhatsApp esta funcionando.";
    const result = await sendWhatsApp(body.to, message);
    const notification = await db.notification.create({
      data: {
        channel: "WHATSAPP",
        kind: "TESTE",
        to: body.to,
        patientName: "Teste de envio",
        message,
        status: result.ok ? "ENVIADA" : "FALHA",
        sentAt: result.ok ? new Date() : null,
        error: result.ok ? null : (result.error || "Falha no envio").slice(0, 500),
        externalId: result.ok ? (result.id ?? null) : null,
      },
    });

    return reply.code(result.ok ? 201 : 502).send({ ...result, notification });
  });

  app.post("/api/notifications/:id/retry", async (req, reply) => {
    const { id } = req.params as { id: string };
    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification) return reply.code(404).send({ error: "Notificacao nao encontrada" });
    if (notification.status === "ENVIADA")
      return reply.code(400).send({ error: "Notificacao ja enviada" });
    return db.notification.update({
      where: { id },
      data: { status: "PENDENTE", scheduledFor: new Date(), error: null },
    });
  });
}

export async function settingsRoutes(app: FastifyInstance) {
  const { getSettings, setSettings } = await import("../notifications/service");

  app.get("/api/settings", async () => getSettings());

  app.put("/api/settings", async (req) => {
    const body = req.body as Record<string, any>;
    const values: Record<string, string> = {};
    if (body.channel && ["WHATSAPP", "SMS"].includes(body.channel))
      values.channel = body.channel;
    if (body.reminderHours !== undefined) {
      const hours = Number(body.reminderHours);
      if (Number.isFinite(hours) && hours >= 1 && hours <= 168)
        values.reminderHours = String(Math.round(hours));
    }
    return setSettings(values);
  });
}

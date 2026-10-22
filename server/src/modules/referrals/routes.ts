import type { FastifyInstance } from "fastify";
import { db } from "../../lib/prisma";
import {
  REFERRAL_KINDS,
  URGENCIES,
  priorityScore,
} from "../../lib/domain";
import {
  buildMessage,
  queueNotification,
  spStartOfDay,
} from "../notifications/service";
import { assignToTrip, referralInclude } from "../trips/assignment";

export async function referralRoutes(app: FastifyInstance) {
  app.get("/api/referrals", async (req) => {
    const { status, search } = req.query as { status?: string; search?: string };
    const where: any = {};
    if (status) {
      const list = status.split(",").map((s) => s.trim()).filter(Boolean);
      where.status = list.length > 1 ? { in: list } : list[0];
    }
    if (search)
      where.OR = [
        { patient: { name: { contains: search } } },
        { destinationCity: { contains: search } },
        { destinationUnit: { contains: search } },
        { specialty: { contains: search } },
      ];
    const referrals = await db.referral.findMany({
      where,
      include: referralInclude,
      orderBy: { requestedAt: "desc" },
      take: 300,
    });
    return referrals.map((r) => ({ ...r, score: priorityScore(r) }));
  });

  app.get("/api/queue", async () => {
    const referrals = await db.referral.findMany({
      where: { status: "AGUARDANDO_VAGA" },
      include: referralInclude,
      orderBy: { queueSince: "asc" },
    });
    return referrals
      .map((r) => ({ ...r, score: priorityScore(r) }))
      .sort((a, b) => b.score - a.score);
  });

  app.get("/api/referrals/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const referral = await db.referral.findUnique({
      where: { id },
      include: {
        patient: true,
        seat: { include: { trip: true } },
        notifications: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!referral) return reply.code(404).send({ error: "Encaminhamento nao encontrado" });
    return { ...referral, score: priorityScore(referral) };
  });

  app.post("/api/referrals", async (req, reply) => {
    const body = req.body as Record<string, any>;
    const patient = await db.patient.findUnique({ where: { id: body.patientId } });
    if (!patient) return reply.code(400).send({ error: "Paciente invalido" });
    if (!REFERRAL_KINDS.includes(body.kind))
      return reply.code(400).send({ error: "Tipo de encaminhamento invalido" });
    if (!URGENCIES.includes(body.urgency))
      return reply.code(400).send({ error: "Urgencia invalida" });
    if (!body.destinationCity?.trim())
      return reply.code(400).send({ error: "Cidade de destino e obrigatoria" });
    const destinationUnit = body.destinationUnit?.trim() || "A definir";

    const referral = await db.referral.create({
      data: {
        patientId: patient.id,
        kind: body.kind,
        specialty: body.specialty?.trim() || null,
        destinationCity: body.destinationCity.trim(),
        destinationUnit,
        requestedBy: body.requestedBy?.trim() || null,
        preferredDate: body.preferredDate ? new Date(body.preferredDate) : null,
        urgency: body.urgency,
        notes: body.notes?.trim() || null,
      },
      include: referralInclude,
    });
    return reply.code(201).send({ ...referral, score: priorityScore(referral) });
  });

  app.patch("/api/referrals/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, any>;
    const existing = await db.referral.findUnique({
      where: { id },
      include: { seat: true, patient: true },
    });
    if (!existing) return reply.code(404).send({ error: "Encaminhamento nao encontrado" });

    if (body.status && body.status !== existing.status) {
      const allowed: Record<string, string[]> = {
        AGUARDANDO_VAGA: ["CANCELADO"],
        CONFIRMADO: ["CANCELADO"],
        CANCELADO: ["AGUARDANDO_VAGA"],
        ATENDIDO: [],
        FALTOU: [],
        EM_VIAGEM: [],
      };
      if (!(allowed[existing.status] || []).includes(body.status)) {
        return reply.code(400).send({
          error: `Transicao invalida: ${existing.status} -> ${body.status}`,
        });
      }
      if (existing.seat && body.status === "CANCELADO") {
        await db.seat.delete({ where: { id: existing.seat.id } });
      }
      await db.referral.update({ where: { id }, data: { status: body.status } });
      if (body.status === "AGUARDANDO_VAGA") {
        await db.referral.update({
          where: { id },
          data: { queueSince: new Date(), status: "AGUARDANDO_VAGA" },
        });
      }
      if (body.status === "CANCELADO") {
        await queueNotification({
          referralId: id,
          kind: "CANCELAMENTO",
          to: existing.patient.phone,
          patientName: existing.patient.name,
          message: buildMessage("CANCELAMENTO", {
            patientName: existing.patient.name,
            kindLabel: existing.kind,
            destinationCity: existing.destinationCity,
            destinationUnit: existing.destinationUnit,
          }),
        });
      }
      const updated = await db.referral.findUnique({
        where: { id },
        include: referralInclude,
      });
      return { ...updated, score: priorityScore(updated!) };
    }

    const updated = await db.referral.update({
      where: { id },
      data: {
        urgency: URGENCIES.includes(body.urgency) ? body.urgency : undefined,
        specialty: body.specialty !== undefined ? body.specialty?.trim() || null : undefined,
        destinationCity: body.destinationCity?.trim() || undefined,
        destinationUnit: body.destinationUnit?.trim() || undefined,
        requestedBy: body.requestedBy?.trim() || undefined,
        preferredDate:
          body.preferredDate !== undefined
            ? body.preferredDate
              ? new Date(body.preferredDate)
              : null
            : undefined,
        notes: body.notes !== undefined ? body.notes?.trim() || null : undefined,
      },
      include: referralInclude,
    });
    return { ...updated, score: priorityScore(updated) };
  });

  app.post("/api/referrals/:id/assign", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { tripId } = req.body as { tripId?: string };
    if (!tripId) return reply.code(400).send({ error: "Viagem nao informada" });
    const result = await assignToTrip(id, tripId);
    if (result.error) return reply.code(result.error.status).send(result.error.body);
    return reply.code(201).send(result.data);
  });

  app.post("/api/referrals/:id/auto-assign", async (req, reply) => {
    const { id } = req.params as { id: string };
    const referral = await db.referral.findUnique({
      where: { id },
      include: { patient: true },
    });
    if (!referral) return reply.code(404).send({ error: "Encaminhamento nao encontrado" });
    if (referral.status !== "AGUARDANDO_VAGA")
      return reply.code(400).send({ error: "Este paciente nao esta mais na fila" });

    const trips = await db.trip.findMany({
      where: {
        status: "PLANEJADA",
        destinationCity: referral.destinationCity,
        departureAt: { gte: spStartOfDay() },
      },
      include: { seats: true },
      orderBy: { departureAt: "asc" },
    });
    const trip = trips.find((t) => t.seats.length < t.capacity);
    if (!trip) {
      return reply.code(409).send({
        error: `Nao ha viagem para ${referral.destinationCity} com vaga livre`,
        code: "SEM_VIAGEM",
        destinationCity: referral.destinationCity,
      });
    }
    const result = await assignToTrip(id, trip.id);
    if (result.error) return reply.code(result.error.status).send(result.error.body);
    return reply.code(201).send(result.data);
  });

  app.post("/api/referrals/:id/unassign", async (req, reply) => {
    const { id } = req.params as { id: string };
    const referral = await db.referral.findUnique({
      where: { id },
      include: { patient: true, seat: { include: { trip: true } } },
    });
    if (!referral) return reply.code(404).send({ error: "Encaminhamento nao encontrado" });
    if (!referral.seat) return reply.code(400).send({ error: "Encaminhamento sem vaga alocada" });
    if (referral.seat.trip.status !== "PLANEJADA")
      return reply.code(400).send({ error: "Viagem ja iniciada: cancele o encaminhamento" });

    await db.seat.delete({ where: { id: referral.seat.id } });
    const updated = await db.referral.update({
      where: { id },
      data: { status: "AGUARDANDO_VAGA", queueSince: new Date() },
      include: referralInclude,
    });

    await queueNotification({
      referralId: referral.id,
      kind: "CANCELAMENTO",
      to: referral.patient.phone,
      patientName: referral.patient.name,
      message: buildMessage("CANCELAMENTO", {
        patientName: referral.patient.name,
        kindLabel: referral.kind,
        destinationCity: referral.destinationCity,
        destinationUnit: referral.destinationUnit,
      }),
    });

    return { ...updated, score: priorityScore(updated) };
  });
}

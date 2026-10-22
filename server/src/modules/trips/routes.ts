import type { FastifyInstance } from "fastify";
import { db } from "../../lib/prisma";
import { spStartOfDay } from "../notifications/service";
import { assignToTrip } from "./assignment";
import { displayLegCities } from "../../lib/trip-phases";
import {
  countSuggestionsByCity,
  getTripSuggestions,
  suggestionsForTripCity,
} from "./suggestions";

const tripInclude = {
  seats: { include: { referral: { include: { patient: true } } } },
  events: { orderBy: { createdAt: "asc" } },
} as const;

function isFilling(trip: { phase: string }) {
  return trip.phase === "IDA_AGENDADA";
}

export async function tripRoutes(app: FastifyInstance) {
  app.get("/api/trips", async (req) => {
    const { status, search } = req.query as { status?: string; search?: string };
    const where: any = {};
    if (status) where.status = status;
    if (search)
      where.OR = [
        { destinationCity: { contains: search } },
        { vehicle: { contains: search } },
        { driver: { contains: search } },
      ];
    const trips = await db.trip.findMany({
      where,
      include: tripInclude,
      orderBy: { departureAt: "asc" },
      take: 200,
    });
    const counts = await countSuggestionsByCity();
    const today = spStartOfDay();
    return trips.map((t) => {
      const freeSeats = t.capacity - t.seats.length;
      const canSuggest = isFilling(t) && freeSeats > 0 && t.departureAt >= today;
      return {
        ...t,
        usedSeats: t.seats.length,
        freeSeats,
        suggestedCount: canSuggest ? suggestionsForTripCity(counts, t.destinationCity) : 0,
      };
    });
  });

  app.get("/api/trips/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const trip = await db.trip.findUnique({ where: { id }, include: tripInclude });
    if (!trip) return reply.code(404).send({ error: "Viagem nao encontrada" });
    return {
      ...trip,
      usedSeats: trip.seats.length,
      freeSeats: trip.capacity - trip.seats.length,
    };
  });

  app.get("/api/trips/:id/suggestions", async (req, reply) => {
    const { id } = req.params as { id: string };
    const trip = await db.trip.findUnique({ where: { id }, include: { seats: true } });
    if (!trip) return reply.code(404).send({ error: "Viagem nao encontrada" });

    const { freeSeats, suggestions } = await getTripSuggestions(trip);
    return {
      tripId: trip.id,
      status: trip.status,
      destinationCity: trip.destinationCity,
      departureAt: trip.departureAt,
      freeSeats,
      suggestions: isFilling(trip) ? suggestions : [],
    };
  });

  app.post("/api/trips/:id/auto-fill", async (req, reply) => {
    const { id } = req.params as { id: string };
    const trip = await db.trip.findUnique({ where: { id }, include: { seats: true } });
    if (!trip) return reply.code(404).send({ error: "Viagem nao encontrada" });
    if (!isFilling(trip))
      return reply.code(400).send({ error: "Esta viagem nao aceita mais vagas" });

    const { freeSeats, suggestions } = await getTripSuggestions(trip, 100);
    const candidates = suggestions.filter((s) => s.sameCity).slice(0, freeSeats);

    const assigned: Record<string, unknown>[] = [];
    for (const candidate of candidates) {
      const result = await assignToTrip(candidate.id, trip.id);
      if (!result.error) assigned.push(result.data);
    }

    const updated = await db.trip.findUnique({ where: { id }, include: { seats: true } });
    return reply.code(201).send({
      assigned,
      freeSeats: updated ? updated.capacity - updated.seats.length : 0,
      usedSeats: updated?.seats.length ?? trip.seats.length + assigned.length,
    });
  });

  app.post("/api/trips", async (req, reply) => {
    const body = req.body as Record<string, any>;
    if (!body.departureAt) return reply.code(400).send({ error: "Data e horario de saida obrigatorios" });
    if (!body.destinationCity?.trim())
      return reply.code(400).send({ error: "Cidade de destino e obrigatoria" });
    if (!body.originCity?.trim())
      return reply.code(400).send({ error: "Cidade de origem e obrigatoria" });
    if (!body.vehicle?.trim()) return reply.code(400).send({ error: "Veiculo e obrigatorio" });
    if (!body.driver?.trim()) return reply.code(400).send({ error: "Motorista e obrigatorio" });
    const capacity = Number(body.capacity);
    if (!Number.isInteger(capacity) || capacity < 1)
      return reply.code(400).send({ error: "Capacidade invalida" });

    const trip = await db.trip.create({
      data: {
        departureAt: new Date(body.departureAt),
        originCity: body.originCity.trim(),
        destinationCity: body.destinationCity.trim(),
        vehicle: body.vehicle.trim(),
        driver: body.driver.trim(),
        phone: body.phone?.trim() || null,
        capacity,
        status: "PLANEJADA",
        phase: "IDA_AGENDADA",
        notes: body.notes?.trim() || null,
        events: {
          create: {
            phase: "IDA_AGENDADA",
            originCity: body.originCity.trim(),
            destinationCity: body.destinationCity.trim(),
            departureAt: new Date(body.departureAt),
            notes: "Viagem agendada",
          },
        },
      },
      include: tripInclude,
    });
    return reply.code(201).send({
      ...trip,
      usedSeats: trip.seats.length,
      freeSeats: trip.capacity - trip.seats.length,
    });
  });

  app.patch("/api/trips/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, any>;
    const trip = await db.trip.findUnique({ where: { id }, include: { seats: true } });
    if (!trip) return reply.code(404).send({ error: "Viagem nao encontrada" });
    if (trip.phase !== "IDA_AGENDADA")
      return reply.code(400).send({ error: "Apenas viagens de ida agendadas podem ser editadas" });

    const capacity = body.capacity !== undefined ? Number(body.capacity) : trip.capacity;
    if (!Number.isInteger(capacity) || capacity < trip.seats.length)
      return reply.code(400).send({ error: `Capacidade nao pode ser menor que ${trip.seats.length} vagas ocupadas` });

    const updated = await db.trip.update({
      where: { id },
      data: {
        departureAt: body.departureAt ? new Date(body.departureAt) : undefined,
        originCity: body.originCity?.trim() || undefined,
        destinationCity: body.destinationCity?.trim() || undefined,
        vehicle: body.vehicle?.trim() || undefined,
        driver: body.driver?.trim() || undefined,
        phone: body.phone !== undefined ? body.phone?.trim() || null : undefined,
        capacity,
        notes: body.notes !== undefined ? body.notes?.trim() || null : undefined,
      },
      include: tripInclude,
    });
    return {
      ...updated,
      usedSeats: updated.seats.length,
      freeSeats: updated.capacity - updated.seats.length,
    };
  });

  app.post("/api/trips/:id/status", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, returnAt } = req.body as { status?: string; returnAt?: string };
    const trip = await db.trip.findUnique({ where: { id }, include: tripInclude });
    if (!trip) return reply.code(404).send({ error: "Viagem nao encontrada" });

    const phase = trip.phase;

    if (status === "EM_ROTA") {
      if (phase !== "IDA_AGENDADA")
        return reply.code(400).send({ error: "So e possivel iniciar a ida de uma viagem agendada" });
      if (trip.seats.length === 0)
        return reply.code(400).send({ error: "Nao e possivel iniciar uma viagem sem passageiros" });
      await db.$transaction([
        db.trip.update({ where: { id }, data: { status: "EM_ROTA", phase: "IDA_EM_ROTA" } }),
        db.seat.updateMany({ where: { tripId: id }, data: { status: "EMBARCADO" } }),
        db.referral.updateMany({
          where: { id: { in: trip.seats.map((s) => s.referralId) } },
          data: { status: "EM_VIAGEM" },
        }),
        db.tripEvent.create({
          data: {
            tripId: id,
            phase: "IDA_EM_ROTA",
            originCity: trip.originCity,
            destinationCity: trip.destinationCity,
            departureAt: trip.departureAt,
            passengerCount: trip.seats.length,
            notes: "Ida iniciada",
          },
        }),
      ]);
    } else if (status === "CONCLUIDA") {
      if (phase === "IDA_EM_ROTA") {
        await db.$transaction([
          db.trip.update({ where: { id }, data: { phase: "IDA_CONCLUIDA" } }),
          db.seat.updateMany({
            where: { tripId: id, status: { not: "FALTOU" } },
            data: { status: "PRESENTE" },
          }),
          db.referral.updateMany({
            where: { id: { in: trip.seats.map((s) => s.referralId) }, status: "EM_VIAGEM" },
            data: { status: "ATENDIDO" },
          }),
          db.referral.updateMany({
            where: {
              id: { in: trip.seats.filter((s) => s.status === "FALTOU").map((s) => s.referralId) },
              status: "EM_VIAGEM",
            },
            data: { status: "FALTOU" },
          }),
          db.tripEvent.create({
            data: {
              tripId: id,
              phase: "IDA_CONCLUIDA",
              originCity: trip.originCity,
              destinationCity: trip.destinationCity,
              departureAt: trip.departureAt,
              passengerCount: trip.seats.filter((s) => s.status !== "FALTOU").length,
              notes: "Ida concluida no destino",
            },
          }),
        ]);
      } else if (phase === "VOLTA_EM_ROTA") {
        await db.$transaction([
          db.trip.update({ where: { id }, data: { status: "CONCLUIDA", phase: "CONCLUIDA" } }),
          db.tripEvent.create({
            data: {
              tripId: id,
              phase: "CONCLUIDA",
              originCity: trip.destinationCity,
              destinationCity: trip.originCity,
              departureAt: trip.returnAt,
              passengerCount: trip.seats.filter((s) => s.status !== "FALTOU").length,
              notes: "Volta concluida na origem",
            },
          }),
        ]);
        const { notifyTripConclusion } = await import("../notifications/service");
        await notifyTripConclusion(trip.id);
      } else {
        return reply.code(400).send({ error: `Nao ha etapa em andamento (fase ${phase})` });
      }
    } else if (status === "VOLTA") {
      if (phase !== "IDA_CONCLUIDA")
        return reply.code(400).send({ error: "Conclua a ida antes de iniciar a volta" });
      const returnDeparture = returnAt ? new Date(returnAt) : new Date();
      const ret = displayLegCities({ ...trip, phase: "VOLTA_EM_ROTA" });
      const viajaram = trip.seats.filter((s) => s.status !== "FALTOU");
      await db.$transaction([
        db.trip.update({
          where: { id },
          data: { phase: "VOLTA_EM_ROTA", returnAt: returnDeparture },
        }),
        db.seat.updateMany({
          where: { tripId: id, status: "PRESENTE" },
          data: { status: "EMBARCADO" },
        }),
        db.tripEvent.create({
          data: {
            tripId: id,
            phase: "VOLTA_EM_ROTA",
            originCity: ret.from,
            destinationCity: ret.to,
            departureAt: returnDeparture,
            passengerCount: viajaram.length,
            notes: "Volta iniciada",
          },
        }),
      ]);
    } else {
      return reply.code(400).send({ error: `Transicao invalida: ${phase} -> ${status}` });
    }

    const full = await db.trip.findUnique({ where: { id }, include: tripInclude });
    return {
      ...full,
      usedSeats: full!.seats.length,
      freeSeats: full!.capacity - full!.seats.length,
    };
  });

  app.patch("/api/trips/:id/seats/:seatId", async (req, reply) => {
    const { id, seatId } = req.params as { id: string; seatId: string };
    const { status } = req.body as { status?: string };
    if (!["RESERVADA", "EMBARCADO", "PRESENTE", "FALTOU"].includes(status || ""))
      return reply.code(400).send({ error: "Status de assento invalido" });
    const seat = await db.seat.findUnique({ where: { id: seatId } });
    if (!seat || seat.tripId !== id)
      return reply.code(404).send({ error: "Assento nao encontrado" });
    const trip = await db.trip.findUnique({ where: { id } });
    const emAndamento = trip?.phase === "IDA_EM_ROTA" || trip?.phase === "VOLTA_EM_ROTA";
    if (trip && !emAndamento && !["RESERVADA"].includes(status!))
      return reply.code(400).send({ error: "Marque a presenca apos iniciar a etapa" });
    if (trip?.phase === "CONCLUIDA" || trip?.phase === "IDA_CONCLUIDA")
      return reply.code(400).send({ error: "Etapa ja concluida" });

    const updated = await db.seat.update({ where: { id: seatId }, data: { status } });
    if (status === "FALTOU" || status === "PRESENTE") {
      await db.referral.update({
        where: { id: seat.referralId },
        data: { status: status === "FALTOU" ? "FALTOU" : "EM_VIAGEM" },
      });
    }
    return updated;
  });

  app.get("/api/trips-calendar", async () => {
    const today = spStartOfDay();
    const [planned, todayTrips, completed] = await Promise.all([
      db.trip.findMany({
        where: { status: "PLANEJADA", departureAt: { gte: new Date() } },
        include: { seats: { include: { referral: { include: { patient: true } } } } },
        orderBy: { departureAt: "asc" },
        take: 20,
      }),
      db.trip.findMany({
        where: { departureAt: { gte: today, lt: spStartOfDay(1) } },
        include: { seats: { include: { referral: { include: { patient: true } } } } },
        orderBy: { departureAt: "asc" },
      }),
      db.trip.findMany({
        where: { status: "CONCLUIDA" },
        include: { seats: { include: { referral: { include: { patient: true } } } } },
        orderBy: { departureAt: "desc" },
        take: 15,
      }),
    ]);

    return {
      planned,
      today: todayTrips,
      completed,
    };
  });
}

import { db } from "../../lib/prisma";
import { priorityScore } from "../../lib/domain";
import {
  buildMessage,
  queueNotification,
  tripMessageContext,
} from "../notifications/service";

export const referralInclude = {
  patient: true,
  seat: { include: { trip: true } },
} as const;

type AssignResult =
  | { error: { status: number; body: Record<string, unknown> }; data?: undefined }
  | { error?: undefined; data: Record<string, unknown> };

export async function assignToTrip(referralId: string, tripId: string): Promise<AssignResult> {
  const referral = await db.referral.findUnique({
    where: { id: referralId },
    include: { patient: true, seat: true },
  });
  if (!referral) {
    return { error: { status: 404, body: { error: "Encaminhamento nao encontrado" } } };
  }
  if (referral.status !== "AGUARDANDO_VAGA") {
    return { error: { status: 400, body: { error: "Este paciente nao esta mais na fila" } } };
  }
  const trip = await db.trip.findUnique({ where: { id: tripId }, include: { seats: true } });
  if (!trip) {
    return { error: { status: 404, body: { error: "Viagem nao encontrada" } } };
  }
  if (trip.status !== "PLANEJADA") {
    return { error: { status: 400, body: { error: "Esta viagem nao aceita mais vagas" } } };
  }
  const used = trip.seats.map((s) => s.number);
  let freeNumber: number | null = null;
  for (let n = 1; n <= trip.capacity; n++) {
    if (!used.includes(n)) {
      freeNumber = n;
      break;
    }
  }
  if (freeNumber === null) {
    return { error: { status: 409, body: { error: "Viagem sem vagas disponiveis" } } };
  }

  const [, seat] = await db.$transaction([
    db.referral.update({ where: { id: referral.id }, data: { status: "CONFIRMADO" } }),
    db.seat.create({
      data: { tripId: trip.id, referralId: referral.id, number: freeNumber },
    }),
  ]);

  await queueNotification({
    referralId: referral.id,
    kind: "CONFIRMACAO",
    to: referral.patient.phone,
    patientName: referral.patient.name,
    message: buildMessage("CONFIRMACAO", tripMessageContext(referral, trip)),
  });

  await queueNotification({
    referralId: referral.id,
    kind: "RETORNO_AGENDADO",
    to: referral.patient.phone,
    patientName: referral.patient.name,
    message: buildMessage("RETORNO_AGENDADO", {
      patientName: referral.patient.name,
      kindLabel: referral.specialty
        ? `${referral.kind.toLowerCase()} de ${referral.specialty}`
        : referral.kind.toLowerCase(),
      destinationCity: trip.destinationCity,
      destinationUnit: referral.destinationUnit,
      originCity: trip.originCity,
      vehicle: trip.vehicle,
      driver: trip.driver,
    }),
  });

  const full = await db.referral.findUnique({
    where: { id: referral.id },
    include: { ...referralInclude, notifications: { orderBy: { createdAt: "desc" } } },
  });
  return {
    data: { ...full, seat, trip, score: priorityScore(full!) },
  };
}

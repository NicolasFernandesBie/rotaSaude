import { db } from "../../lib/prisma";
import { formatDateTime, formatDate, formatTime } from "../../lib/domain";
import { isValidPhone, normalizePhone, toWhatsAppNumber } from "../../lib/phone";
import { getBaileysStatus } from "./baileys";
import { getWhatsAppConfig, sendWhatsApp } from "./whatsapp";

export const DEFAULT_SETTINGS = {
  channel: "WHATSAPP",
  reminderHours: "24",
};

export async function getSettings() {
  const rows = await db.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    channel: map.channel || DEFAULT_SETTINGS.channel,
    reminderHours: Number(map.reminderHours || DEFAULT_SETTINGS.reminderHours),
  };
}

export async function setSettings(values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== "string") continue;
    await db.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
  return getSettings();
}

export { isValidPhone, normalizePhone } from "../../lib/phone";

type MessageContext = {
  patientName: string;
  kindLabel: string;
  destinationCity: string;
  destinationUnit: string;
  departureAt?: Date | string;
  originCity?: string;
  vehicle?: string;
  driver?: string;
};

export function buildMessage(kind: string, ctx: MessageContext): string {
  const nome = ctx.patientName.split(" ")[0];
  const saida = ctx.departureAt
    ? `${formatDate(ctx.departureAt)} às ${formatTime(ctx.departureAt)}`
    : "";
  const transporte = `${ctx.vehicle || "veículo"} com ${ctx.driver || "motorista"}`;
  switch (kind) {
    case "CONFIRMACAO":
      return `Olá ${nome}! Sua ${ctx.kindLabel.toLowerCase()} em ${ctx.destinationUnit} (${ctx.destinationCity}) foi CONFIRMADA. Saída em ${saida}, saindo de ${ctx.originCity}, ${transporte}. Compareça 30 minutos antes. Dúvidas: responda esta mensagem.`;
    case "RETORNO_AGENDADO":
      return `Olá ${nome}! Sua viagem de ida para ${ctx.destinationCity} também inclui o retorno a ${ctx.originCity} no mesmo transporte, no mesmo dia. O horário da volta será informado no dia do atendimento. Dúvidas: responda esta mensagem.`;
    case "LEMBRETE":
      return `Olá ${nome}, lembramos: sua viagem para ${ctx.destinationCity} sai em ${saida}, ${transporte}. Compareça 30 minutos antes no local de saída.`;
    case "ALTERACAO":
      return `Olá ${nome}, sua reserva de transporte para ${ctx.destinationCity} foi alterada. Nova saída: ${saida}, ${transporte}.`;
    case "CANCELAMENTO":
      return `Olá ${nome}, sua reserva de transporte para ${ctx.destinationCity} foi cancelada e você voltou para a fila de espera. Você será avisado assim que uma nova vaga for confirmada.`;
    case "RETORNO":
      return `Olá ${nome}, a viagem para ${ctx.destinationCity} foi concluída. Obrigado por comparecer! Em caso de dúvidas sobre o atendimento, procure a unidade de saúde.`;
    default:
      return `Olá ${nome}, atualização sobre o seu encaminhamento para ${ctx.destinationCity}.`;
  }
}

type QueueInput = {
  referralId?: string;
  kind: string;
  channel?: string;
  to: string;
  patientName: string;
  message: string;
  scheduledFor?: Date;
};

export async function queueNotification(input: QueueInput) {
  const settings = await getSettings();
  const channel = input.channel || settings.channel;
  return db.notification.create({
    data: {
      referralId: input.referralId ?? null,
      channel,
      kind: input.kind,
      to: input.to,
      patientName: input.patientName,
      message: input.message,
      status: "PENDENTE",
      scheduledFor: input.scheduledFor ?? new Date(),
    },
  });
}

export function tripMessageContext(referral: {
  patient: { name: string };
  kind: string;
  specialty: string | null;
  destinationCity: string;
  destinationUnit: string;
}, trip: {
  departureAt: Date;
  originCity: string;
  vehicle: string;
  driver: string;
}): MessageContext {
  return {
    patientName: referral.patient.name,
    kindLabel: referral.specialty
      ? `${referral.kind.toLowerCase()} de ${referral.specialty}`
      : referral.kind.toLowerCase(),
    destinationCity: referral.destinationCity,
    destinationUnit: referral.destinationUnit,
    departureAt: trip.departureAt,
    originCity: trip.originCity,
    vehicle: trip.vehicle,
    driver: trip.driver,
  };
}

function spStartOfDay(offsetDays = 0): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + offsetDays));
}

export { spStartOfDay };

async function scheduleReminders() {
  const settings = await getSettings();
  const windowEnd = new Date(Date.now() + settings.reminderHours * 3_600_000);
  const trips = await db.trip.findMany({
    where: { status: "PLANEJADA", departureAt: { gte: new Date(), lte: windowEnd } },
    include: {
      seats: {
        include: {
          referral: { include: { patient: true } },
        },
      },
    },
  });

  for (const trip of trips) {
    for (const seat of trip.seats) {
      const referral = seat.referral;
      if (referral.status !== "CONFIRMADO") continue;
      const existing = await db.notification.findFirst({
        where: { referralId: referral.id, kind: "LEMBRETE" },
        orderBy: { createdAt: "desc" },
      });
      if (existing && trip.departureAt.getTime() - existing.createdAt.getTime() < 48 * 3_600_000) {
        continue;
      }
      await queueNotification({
        referralId: referral.id,
        kind: "LEMBRETE",
        to: referral.patient.phone,
        patientName: referral.patient.name,
        message: buildMessage("LEMBRETE", tripMessageContext(referral, trip)),
      });
    }
  }
}

async function deliverPending() {
  const pending = await db.notification.findMany({
    where: { status: "PENDENTE", scheduledFor: { lte: new Date() } },
    orderBy: { scheduledFor: "asc" },
    take: 25,
  });

  for (const notification of pending) {
    if (!isValidPhone(notification.to)) {
      await db.notification.update({
        where: { id: notification.id },
        data: {
          status: "FALHA",
          error: "Numero de telefone invalido (DDD + numero)",
        },
      });
      console.warn(`[notificacao FALHOU] ${notification.to} sem telefone valido`);
      continue;
    }
    if (
      notification.channel !== "SMS" &&
      getWhatsAppConfig().provider === "baileys" &&
      !getBaileysStatus().connected
    ) {
      return;
    }

    if (notification.channel === "SMS") {
      await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 250));
      await db.notification.update({
        where: { id: notification.id },
        data: { status: "ENVIADA", sentAt: new Date(), error: null },
      });
      console.log(
        `[sms simulado] -> ${normalizePhone(notification.to)} | ${notification.message}`,
      );
      continue;
    }

    const result = await sendWhatsApp(notification.to, notification.message);
    if (!result.ok) {
      const error = (result.error || "Falha no envio pelo provedor").slice(0, 500);
      await db.notification.update({
        where: { id: notification.id },
        data: { status: "FALHA", error },
      });
      console.warn(
        `[notificacao FALHOU] ${normalizePhone(notification.to)} via ${result.provider}: ${error}`,
      );
      continue;
    }

    await db.notification.update({
      where: { id: notification.id },
      data: { status: "ENVIADA", sentAt: new Date(), error: null, externalId: result.id ?? null },
    });
    const id = result.id ? ` id=${result.id}` : "";
    console.log(
      `[notificacao ${result.provider}] -> ${toWhatsAppNumber(notification.to)}${id} | ${notification.message}`,
    );
  }
}

export async function notifyTripConclusion(tripId: string) {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: {
      seats: { include: { referral: { include: { patient: true } } } },
    },
  });
  if (!trip) return;
  for (const seat of trip.seats) {
    const referral = seat.referral;
    if (referral.status !== "ATENDIDO" && referral.status !== "FALTOU") continue;
    await queueNotification({
      referralId: referral.id,
      kind: "RETORNO",
      to: referral.patient.phone,
      patientName: referral.patient.name,
      message: buildMessage("RETORNO", tripMessageContext(referral, trip)),
    });
  }
}

export function startNotificationWorker() {
  const tick = async () => {
    try {
      await scheduleReminders();
      await deliverPending();
    } catch (error) {
      console.error("[worker] erro no ciclo de notificacoes", error);
    }
  };
  void tick();
  setInterval(tick, 15_000);
}

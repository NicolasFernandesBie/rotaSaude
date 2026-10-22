export const URGENCIES = ["CRITICA", "ALTA", "MEDIA", "BAIXA"] as const;
export const REFERRAL_KINDS = ["CONSULTA", "EXAME", "TRATAMENTO"] as const;
export const MOBILITIES = ["INDEPENDENTE", "APOIO", "CADEIRANTE"] as const;

export const URGENCY_META: Record<string, { label: string; weight: number }> = {
  CRITICA: { label: "Crítica", weight: 40 },
  ALTA: { label: "Alta", weight: 30 },
  MEDIA: { label: "Média", weight: 20 },
  BAIXA: { label: "Baixa", weight: 10 },
};

export const REFERRAL_STATUS_META: Record<string, { label: string }> = {
  AGUARDANDO_VAGA: { label: "Aguardando vaga" },
  CONFIRMADO: { label: "Confirmado" },
  EM_VIAGEM: { label: "Em viagem" },
  ATENDIDO: { label: "Atendido" },
  FALTOU: { label: "Não compareceu" },
  CANCELADO: { label: "Cancelado" },
};

export const TRIP_STATUS_META: Record<string, { label: string }> = {
  PLANEJADA: { label: "Planejada" },
  EM_ROTA: { label: "Em rota" },
  CONCLUIDA: { label: "Concluída" },
};

export const NOTIFICATION_KIND_META: Record<string, { label: string }> = {
  CONFIRMACAO: { label: "Confirmação de vaga" },
  RETORNO_AGENDADO: { label: "Volta agendada" },
  LEMBRETE: { label: "Lembrete de saída" },
  ALTERACAO: { label: "Alteração" },
  CANCELAMENTO: { label: "Cancelamento" },
  RETORNO: { label: "Conclusão da viagem" },
  TESTE: { label: "Teste de envio" },
};

export function priorityScore(referral: {
  urgency: string;
  queueSince: Date;
  patient?: { birthDate: Date | null } | null;
}): number {
  const base = URGENCY_META[referral.urgency]?.weight ?? 10;
  const days = Math.floor(
    (Date.now() - new Date(referral.queueSince).getTime()) / 86_400_000,
  );
  const waiting = Math.min(days * 2, 30);
  let ageBonus = 0;
  if (referral.patient?.birthDate) {
    const age = Math.floor(
      (Date.now() - new Date(referral.patient.birthDate).getTime()) /
        (365.25 * 86_400_000),
    );
    if (age >= 70) ageBonus = 8;
    else if (age >= 60) ageBonus = 5;
  }
  return base + waiting + ageBonus;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

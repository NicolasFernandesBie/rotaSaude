export const referralStatus: Record<string, { label: string; badge: string }> = {
  AGUARDANDO_VAGA: { label: "Na fila", badge: "bg-amber-100 text-amber-800" },
  CONFIRMADO: { label: "Com vaga", badge: "bg-sky-100 text-sky-800" },
  EM_VIAGEM: { label: "Em viagem", badge: "bg-indigo-100 text-indigo-800" },
  ATENDIDO: { label: "Atendido", badge: "bg-emerald-100 text-emerald-800" },
  FALTOU: { label: "Faltou", badge: "bg-rose-100 text-rose-800" },
  CANCELADO: { label: "Cancelado", badge: "bg-slate-200 text-slate-600" },
};

export const tripStatus: Record<string, { label: string; badge: string }> = {
  PLANEJADA: { label: "Planejada", badge: "bg-amber-100 text-amber-800" },
  EM_ROTA: { label: "Em rota", badge: "bg-indigo-100 text-indigo-800" },
  CONCLUIDA: { label: "Concluída", badge: "bg-emerald-100 text-emerald-800" },
};

export const tripKind: Record<string, { label: string; badge: string }> = {
  IDA: { label: "Ida", badge: "bg-teal-100 text-teal-800" },
  VOLTA: { label: "Volta", badge: "bg-violet-100 text-violet-800" },
};

export const urgency: Record<string, { label: string; badge: string }> = {
  CRITICA: { label: "Crítica", badge: "bg-rose-600 text-white" },
  ALTA: { label: "Alta", badge: "bg-orange-500 text-white" },
  MEDIA: { label: "Média", badge: "bg-amber-400 text-amber-950" },
  BAIXA: { label: "Baixa", badge: "bg-slate-300 text-slate-700" },
};

export const notificationStatus: Record<string, { label: string; badge: string }> = {
  PENDENTE: { label: "Pendente", badge: "bg-amber-100 text-amber-800" },
  ENVIADA: { label: "Enviada", badge: "bg-emerald-100 text-emerald-800" },
  FALHA: { label: "Falhou", badge: "bg-rose-100 text-rose-800" },
};

export const seatStatus: Record<string, { label: string; badge: string }> = {
  RESERVADA: { label: "Reservada", badge: "bg-sky-100 text-sky-800" },
  EMBARCADO: { label: "Embarcado", badge: "bg-indigo-100 text-indigo-800" },
  PRESENTE: { label: "Presente", badge: "bg-emerald-100 text-emerald-800" },
  FALTOU: { label: "Faltou", badge: "bg-rose-100 text-rose-800" },
};

export const referralKinds: Record<string, string> = {
  CONSULTA: "Consulta",
  EXAME: "Exame",
  TRATAMENTO: "Tratamento",
};

export const mobilityLabels: Record<string, string> = {
  INDEPENDENTE: "Independente",
  APOIO: "Precisa de apoio",
  CADEIRANTE: "Cadeirante",
};

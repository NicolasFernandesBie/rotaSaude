export function departureLabel(
  departureAt: string,
  phase: string,
  now: number | null,
): string {
  if (phase === "IDA_EM_ROTA") return "Ida em andamento";
  if (phase === "IDA_CONCLUIDA") return "No destino · aguardando volta";
  if (phase === "VOLTA_EM_ROTA") return "Volta em andamento";
  if (phase === "CONCLUIDA") return "Viagem concluída";
  if (!now) return "Saída programada";
  const diff = new Date(departureAt).getTime() - now;
  if (diff <= 0) return "Horário de saída passou";
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `Sai em ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return `Sai em ${hours}h${rest ? ` ${rest}min` : ""}`;
  }
  const days = Math.floor(hours / 24);
  return `Sai em ${days} dia${days > 1 ? "s" : ""}`;
}

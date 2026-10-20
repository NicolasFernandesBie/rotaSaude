const tz = "America/Sao_Paulo";

export function formatDate(iso?: string | Date | null): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("pt-BR", { timeZone: tz });
}

export function formatTime(iso?: string | Date | null): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(iso?: string | Date | null): string {
  if (!iso) return "—";
  return `${formatDate(iso)} às ${formatTime(iso)}`;
}

export function formatPhone(phone?: string | null): string {
  const d = (phone || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone || "—";
}

export function age(birthDate?: string | Date | null): number | null {
  if (!birthDate) return null;
  const d = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 86_400_000));
}

export function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export const RETURN_OFFSET_HOURS = 6;

export function returnDepartureAt(idaDepartureAt: string | Date): Date {
  const d = typeof idaDepartureAt === "string" ? new Date(idaDepartureAt) : idaDepartureAt;
  return new Date(d.getTime() + RETURN_OFFSET_HOURS * 3_600_000);
}

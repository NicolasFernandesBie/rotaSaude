import { referralStatus } from "@/lib/status";
import type { Patient } from "./types";

export function patientSituation(p: Patient): { label: string; badge: string } {
  const refs = p.referrals || [];
  const find = (status: string) => refs.some((r) => r.status === status);
  if (find("EM_VIAGEM")) return { label: "Em viagem", badge: "bg-indigo-100 text-indigo-800" };
  if (find("CONFIRMADO")) return { label: "Com vaga", badge: "bg-sky-100 text-sky-800" };
  if (find("AGUARDANDO_VAGA")) return { label: "Na fila", badge: "bg-amber-100 text-amber-800" };
  if (refs[0])
    return referralStatus[refs[0].status] || { label: "—", badge: "bg-slate-100 text-slate-600" };
  return { label: "Sem encaminhamento", badge: "bg-slate-100 text-slate-500" };
}

"use client";

import { formatDateTime } from "./format";
import { showToast } from "./toast";
import { referralsApi } from "@/features/referrals/api";

export async function darVaga(referral: {
  id: string;
  destinationCity: string;
  patient?: { name: string } | null;
}): Promise<boolean> {
  try {
    const result = await referralsApi.autoAssign(referral.id);
    const nome = referral.patient?.name.split(" ")[0] || "Paciente";
    showToast({
      message: `Vaga confirmada para ${nome} — ${result.trip.destinationCity}, ${formatDateTime(result.trip.departureAt)}. Aviso enviado.`,
    });
    return true;
  } catch {
    showToast({
      type: "error",
      message: `Não há viagem com vaga para ${referral.destinationCity}. Crie uma viagem para esse destino.`,
      action: {
        label: "Criar viagem",
        href: `/transportes/novo?city=${encodeURIComponent(referral.destinationCity)}`,
      },
    });
    return false;
  }
}

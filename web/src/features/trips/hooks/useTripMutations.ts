"use client";

import { useState } from "react";
import { showToast } from "@/lib/toast";
import { tripsApi } from "../api";

export function useTripMutations(onChanged?: () => void) {
  const [busy, setBusy] = useState(false);

  async function startLeg(tripId: string, passengers: number) {
    if (
      !window.confirm(
        `Iniciar a viagem com ${passengers} passageiro(s)? Depois marque quem embarcou.`,
      )
    )
      return;
    setBusy(true);
    try {
      await tripsApi.changeStatus(tripId, "EM_ROTA");
      showToast({ message: "Viagem iniciada. Marque a presença dos passageiros." });
      onChanged?.();
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao iniciar viagem",
      });
    } finally {
      setBusy(false);
    }
  }

  async function startReturn(tripId: string) {
    const horario = window.prompt("Horário da volta (HH:MM):", "16:00");
    if (!horario) return;
    const match = horario.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
      showToast({ type: "error", message: "Horário inválido. Use o formato HH:MM." });
      return;
    }
    const returnAt = new Date();
    returnAt.setHours(Number(match[1]), Number(match[2]), 0, 0);
    setBusy(true);
    try {
      await tripsApi.changeStatus(tripId, "VOLTA", returnAt.toISOString());
      showToast({ message: "Volta iniciada. Marque a presença dos passageiros." });
      onChanged?.();
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao iniciar a volta",
      });
    } finally {
      setBusy(false);
    }
  }

  return { busy, startLeg, startReturn };
}

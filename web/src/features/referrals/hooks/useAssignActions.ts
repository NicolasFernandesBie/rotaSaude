"use client";

import { useState } from "react";
import { darVaga } from "@/lib/actions";
import { showToast } from "@/lib/toast";
import { referralsApi } from "../api";
import { tripsApi } from "@/features/trips/api";
import type { Referral, Suggestion } from "../types";

export function useAssignActions(onChanged?: () => void, onFillChanged?: () => void) {
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);

  async function reserve(referral: Referral) {
    setReservingId(referral.id);
    try {
      await darVaga(referral);
      onChanged?.();
    } finally {
      setReservingId(null);
    }
  }

  async function addSuggestion(suggestion: Suggestion, tripId: string) {
    setAddingId(suggestion.id);
    try {
      await referralsApi.assign(suggestion.id, tripId);
      showToast({
        message: `${suggestion.patient?.name.split(" ")[0] || "Paciente"} entrou na viagem. Aviso enviado.`,
      });
      onChanged?.();
      onFillChanged?.();
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao adicionar passageiro",
      });
    } finally {
      setAddingId(null);
    }
  }

  async function fillTrip(
    tripId: string,
    freeSeats: number,
    suggestionCount: number,
  ) {
    const vagas = Math.min(freeSeats, suggestionCount);
    if (vagas === 0) return;
    if (
      !window.confirm(
        `Adicionar ${vagas} paciente(s) sugerido(s) por prioridade e avisar cada um?`,
      )
    )
      return;
    setFilling(true);
    try {
      const result = await tripsApi.autoFill(tripId);
      showToast({
        message: `${result.assigned.length} paciente(s) adicionados à viagem. Avisos enviados.`,
      });
      onChanged?.();
      onFillChanged?.();
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao preencher vagas",
      });
    } finally {
      setFilling(false);
    }
  }

  return { reservingId, addingId, filling, reserve, addSuggestion, fillTrip };
}

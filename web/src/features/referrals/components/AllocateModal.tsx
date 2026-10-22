"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatDateTime } from "@/lib/format";
import { showToast } from "@/lib/toast";
import type { Referral } from "@/features/referrals/types";
import type { Trip } from "@/features/trips/types";
import { Badge, Button, Empty, ErrorBox, Modal, Spinner } from "@/components/ui";

export function AllocateModal({
  referral,
  onClose,
  onDone,
}: {
  referral: Referral | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { data: trips, loading, error, reload } = useApi<Trip[]>(
    referral ? "/api/trips?status=PLANEJADA" : null,
  );
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const matches = (trips || []).filter(
    (t) => (t.freeSeats ?? t.capacity - (t.seats?.length || 0)) > 0,
  );
  const sameCity = matches.filter((t) => t.destinationCity === referral?.destinationCity);
  const others = matches.filter((t) => t.destinationCity !== referral?.destinationCity);

  async function assign(tripId: string) {
    if (!referral) return;
    setSaving(true);
    setActionError(null);
    try {
      await api(`/api/referrals/${referral.id}/assign`, {
        method: "POST",
        body: { tripId },
      });
      showToast({
        message: `Vaga confirmada para ${referral.patient?.name.split(" ")[0] || "paciente"}. Aviso enviado.`,
      });
      onDone();
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao alocar vaga");
      reload();
    } finally {
      setSaving(false);
    }
  }

  const renderTrip = (trip: Trip) => {
    const free = trip.freeSeats ?? trip.capacity - (trip.seats?.length || 0);
    return (
      <div
        key={trip.id}
        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">
            {trip.originCity} → {trip.destinationCity}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatDateTime(trip.departureAt)} · {trip.vehicle} · {trip.driver}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge className={free <= 1 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
            {free} {free === 1 ? "vaga" : "vagas"}
          </Badge>
          <Button size="sm" onClick={() => assign(trip.id)} disabled={saving}>
            {saving ? "Alocando..." : "Alocar"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={Boolean(referral)}
      onClose={onClose}
      title={referral ? `Alocar vaga — ${referral.patient?.name}` : "Alocar vaga"}
    >
      {referral ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Destino: <span className="font-medium text-slate-700">{referral.destinationCity}</span> ·{" "}
            {referral.destinationUnit}
          </p>
          {actionError ? <ErrorBox message={actionError} /> : null}
          {loading ? (
            <Spinner label="Carregando viagens..." />
          ) : error ? (
            <ErrorBox message={error} />
          ) : matches.length === 0 ? (
            <Empty
              title="Nenhuma viagem planejada com vagas livres"
              hint="Crie uma nova viagem em Transportes e tente novamente."
            />
          ) : (
            <div className="space-y-3">
              {sameCity.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Viagens para {referral.destinationCity}
                  </p>
                  {sameCity.map(renderTrip)}
                </div>
              ) : (
                <Empty
                  title={`Sem viagens para ${referral.destinationCity}`}
                  hint="Nenhuma viagem planejada para este destino com vagas livres."
                />
              )}
              {others.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Outros destinos (não recomendado)
                  </p>
                  {others.map(renderTrip)}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

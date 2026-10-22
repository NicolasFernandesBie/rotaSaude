"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AllocateModal } from "@/features/referrals/components/AllocateModal";
import { darVaga } from "@/lib/actions";
import { api } from "@/lib/api";
import { daysSince, formatDate, formatDateTime, formatPhone } from "@/lib/format";
import {
  mobilityLabels,
  notificationStatus,
  referralKinds,
  referralStatus,
  urgency,
} from "@/lib/status";
import { showToast } from "@/lib/toast";
import type { Referral } from "@/features/referrals/types";
import { useApi } from "@/lib/useApi";
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  PageHeader,
  Spinner,
} from "@/components/ui";

export default function EncaminhamentoDetalhePage() {
  const params = useParams<{ id: string }>();
  const { data, error, loading, reload } = useApi<Referral>(`/api/referrals/${params.id}`);
  const [alocando, setAlocando] = useState(false);
  const [busy, setBusy] = useState(false);

  async function executar(fn: () => Promise<unknown>, mensagem: string) {
    setBusy(true);
    try {
      await fn();
      showToast({ message: mensagem });
      reload();
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Não foi possível concluir a ação",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner label="Carregando..." />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;

  const r = data;
  const trip = r.seat?.trip;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={r.patient?.name || "Encaminhamento"}
        subtitle={`${referralKinds[r.kind]}${r.specialty ? ` de ${r.specialty}` : ""} em ${r.destinationCity}`}
        actions={
          <Link href={`/pacientes/${r.patientId}`}>
            <Button variant="secondary">Ver cadastro</Button>
          </Link>
        }
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={referralStatus[r.status]?.badge}>{referralStatus[r.status]?.label}</Badge>
          <Badge className={urgency[r.urgency]?.badge}>{urgency[r.urgency]?.label}</Badge>
          {r.status === "AGUARDANDO_VAGA" ? (
            <span className="text-xs text-slate-500">
              esperando há {daysSince(r.queueSince)} dia(s) · prioridade {r.score} pts
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {r.status === "AGUARDANDO_VAGA" ? (
            <>
              <Button
                size="lg"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const ok = await darVaga(r);
                  if (ok) reload();
                  setBusy(false);
                }}
              >
                Dar vaga na próxima viagem
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setAlocando(true)}>
                Escolher viagem
              </Button>
            </>
          ) : null}

          {r.status === "CONFIRMADO" && trip ? (
            <>
              <Link href={`/transportes/${trip.id}`}>
                <Button size="lg" variant="secondary">
                  Ver viagem
                </Button>
              </Link>
              {trip.status === "PLANEJADA" ? (
                <Button
                  size="lg"
                  variant="danger"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Tirar da viagem e devolver para a fila?")) {
                      void executar(
                        () => api(`/api/referrals/${r.id}/unassign`, { method: "POST", body: {} }),
                        "Paciente voltou para a fila. Aviso enviado.",
                      );
                    }
                  }}
                >
                  Tirar da viagem
                </Button>
              ) : null}
            </>
          ) : null}

          {r.status === "CANCELADO" ? (
            <Button
              size="lg"
              disabled={busy}
              onClick={() =>
                executar(
                  () =>
                    api(`/api/referrals/${r.id}`, {
                      method: "PATCH",
                      body: { status: "AGUARDANDO_VAGA" },
                    }),
                  "Paciente voltou para a fila.",
                )
              }
            >
              Colocar de volta na fila
            </Button>
          ) : null}

          {r.status === "AGUARDANDO_VAGA" || r.status === "CONFIRMADO" ? (
            <Button
              size="lg"
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Cancelar este encaminhamento? A pessoa será avisada.")) {
                  void executar(
                    () =>
                      api(`/api/referrals/${r.id}`, {
                        method: "PATCH",
                        body: { status: "CANCELADO" },
                      }),
                    "Encaminhamento cancelado. Aviso enviado.",
                  );
                }
              }}
            >
              Cancelar
            </Button>
          ) : null}
        </div>

        {trip ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-800">
              Vaga: {trip.originCity} → {trip.destinationCity}
            </p>
            <p className="text-xs text-slate-500">
              {formatDateTime(trip.departureAt)} · {trip.vehicle} · assento {r.seat?.number}
            </p>
          </div>
        ) : null}
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Detalhes
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">Destino</dt>
            <dd className="font-medium text-slate-800">{r.destinationUnit}</dd>
            <dd className="text-slate-500">{r.destinationCity}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Solicitado por</dt>
            <dd className="font-medium text-slate-800">{r.requestedBy || "—"}</dd>
            <dd className="text-slate-500">em {formatDate(r.requestedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Data prevista</dt>
            <dd className="font-medium text-slate-800">
              {r.preferredDate ? formatDate(r.preferredDate) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Paciente</dt>
            <dd className="font-medium text-slate-800">{formatPhone(r.patient?.phone)}</dd>
            <dd className="text-slate-500">
              {r.patient?.healthPost} · {mobilityLabels[r.patient?.mobility || ""]}
            </dd>
          </div>
          {r.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-400">Observações</dt>
              <dd className="text-slate-700">{r.notes}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <details className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Mensagens enviadas ({r.notifications?.length || 0})
        </summary>
        <div className="border-t border-slate-100 px-5 py-4">
          {!r.notifications || r.notifications.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma mensagem ainda.</p>
          ) : (
            <ul className="space-y-3">
              {r.notifications.map((n) => (
                <li key={n.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={notificationStatus[n.status]?.badge}>
                      {notificationStatus[n.status]?.label}
                    </Badge>
                    <span className="text-xs font-medium text-slate-600">
                      {n.channel === "SMS" ? "SMS" : "WhatsApp"} · {n.kind}
                    </span>
                    <span className="ml-auto text-[11px] text-slate-400">
                      {formatDateTime(n.sentAt || n.scheduledFor)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{n.message}</p>
                  {n.error ? <p className="mt-1 text-xs text-rose-600">{n.error}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <AllocateModal
        referral={alocando ? r : null}
        onClose={() => setAlocando(false)}
        onDone={reload}
      />
    </div>
  );
}

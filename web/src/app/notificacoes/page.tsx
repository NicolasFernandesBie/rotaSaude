"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime, formatPhone } from "@/lib/format";
import { notificationStatus } from "@/lib/status";
import type { Notification } from "@/features/notifications/types";
import { useApi } from "@/lib/useApi";
import {
  Badge,
  Button,
  Empty,
  ErrorBox,
  Modal,
  PageHeader,
  Spinner,
  inputClass,
} from "@/components/ui";

const tabs = [
  { key: "", label: "Todas" },
  { key: "PENDENTE", label: "Pendentes" },
  { key: "ENVIADA", label: "Enviadas" },
  { key: "FALHA", label: "Falhas" },
];

export default function NotificacoesPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [aberta, setAberta] = useState<Notification | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, loading, error: loadError, reload } = useApi<Notification[]>(
    `/api/notifications?${new URLSearchParams({
      ...(status ? { status } : {}),
      ...(term ? { search: term } : {}),
    }).toString()}`,
  );

  async function retry(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/notifications/${id}/retry`, { method: "POST", body: {} });
      setAberta(null);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao reenviar");
    } finally {
      setBusy(false);
    }
  }

  const list = data || [];

  return (
    <div>
      <PageHeader
        title="Mensagens enviadas"
        subtitle="Disparos automáticos de confirmação, lembrete e status por WhatsApp/SMS"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatus(tab.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                status === tab.key
                  ? "bg-teal-700 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 tabular-nums opacity-70">
                {tab.key === ""
                  ? list.length
                  : list.filter((n) => n.status === tab.key).length}
              </span>
            </button>
          ))}
        </div>
        <form
          className="ml-auto flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTerm(search.trim());
          }}
        >
          <input
            className={`${inputClass} w-64`}
            placeholder="Buscar por paciente ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>
      </div>

      {error ? <div className="mb-4"><ErrorBox message={error} /></div> : null}

      {loading ? (
        <Spinner />
      ) : loadError ? (
        <ErrorBox message={loadError} />
      ) : list.length === 0 ? (
        <Empty title="Nenhuma notificação encontrada" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold">Paciente</th>
                <th className="px-4 py-3 font-semibold">Canal / Tipo</th>
                <th className="px-4 py-3 font-semibold">Destinatário</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((n) => (
                <tr key={n.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {formatDateTime(n.sentAt || n.scheduledFor)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{n.patientName}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {n.channel === "SMS" ? "SMS" : "WhatsApp"}
                    <p className="text-xs text-slate-400">{n.kindLabel || n.kind}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatPhone(n.to)}</td>
                  <td className="px-4 py-3">
                    <Badge className={notificationStatus[n.status]?.badge}>
                      {notificationStatus[n.status]?.label}
                    </Badge>
                    {n.error ? <p className="mt-1 text-[11px] text-rose-600">{n.error}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="secondary" onClick={() => setAberta(n)}>
                      Ver mensagem
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(aberta)} onClose={() => setAberta(null)} title="Mensagem">
        {aberta ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-400">Paciente</dt>
                <dd className="font-medium text-slate-800">{aberta.patientName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Destinatário</dt>
                <dd className="font-medium text-slate-800">{formatPhone(aberta.to)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Canal</dt>
                <dd className="font-medium text-slate-800">
                  {aberta.channel === "SMS" ? "SMS" : "WhatsApp"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Tipo</dt>
                <dd className="font-medium text-slate-800">{aberta.kindLabel || aberta.kind}</dd>
              </div>
            </dl>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm leading-relaxed text-slate-700">{aberta.message}</p>
            </div>
            <p className="text-xs text-slate-400">
              Agendada para {formatDateTime(aberta.scheduledFor)}
              {aberta.sentAt ? ` · enviada em ${formatDateTime(aberta.sentAt)}` : ""}
            </p>
            {aberta.status === "FALHA" ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                <span className="text-xs text-rose-700">
                  {aberta.error || "Falha no envio"}
                </span>
                <Button size="sm" disabled={busy} onClick={() => retry(aberta.id)}>
                  {busy ? "Reenviando..." : "Reenviar"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

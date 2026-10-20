"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { darVaga } from "@/lib/actions";
import { daysSince, formatDateTime } from "@/lib/format";
import { referralKinds, referralStatus, urgency } from "@/lib/status";
import type { Referral } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import {
  Badge,
  Button,
  Empty,
  ErrorBox,
  PageHeader,
  Spinner,
  inputClass,
} from "@/lib/ui";

const tabs = [
  { key: "AGUARDANDO_VAGA", label: "Na fila" },
  { key: "CONFIRMADO", label: "Com vaga" },
  { key: "EM_VIAGEM", label: "Em viagem" },
  { key: "ATENDIDO,FALTOU,CANCELADO", label: "Histórico" },
];

function Fila() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") || "AGUARDANDO_VAGA";
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, error, loading, reload } = useApi<Referral[]>(
    `/api/referrals?${new URLSearchParams({
      status,
      ...(term ? { search: term } : {}),
    }).toString()}`,
  );

  const lista = data || [];
  const naFila = status === "AGUARDANDO_VAGA";

  return (
    <div>
      <PageHeader
        title="Fila e histórico"
        subtitle="Quem está esperando vaga, quem já tem e quem já foi atendido"
        actions={
          <Link href="/novo">
            <Button>+ Novo atendimento</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => router.push(`/encaminhamentos?status=${tab.key}`)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              status === tab.key
                ? "bg-teal-700 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 tabular-nums opacity-70">
              {status === tab.key ? lista.length : ""}
            </span>
          </button>
        ))}
      </div>

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setTerm(search.trim());
        }}
      >
        <input
          className={inputClass}
          placeholder="Buscar por paciente, cidade ou especialidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} />
      ) : lista.length === 0 ? (
        <Empty
          title={naFila ? "Ninguém na fila" : "Nada por aqui"}
          hint={naFila ? "Cadastre um novo atendimento para começar." : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {naFila ? <th className="px-4 py-3 font-semibold">#</th> : null}
                <th className="px-4 py-3 font-semibold">Paciente / o que precisa</th>
                <th className="px-4 py-3 font-semibold">Destino</th>
                <th className="px-4 py-3 font-semibold">Urgência</th>
                <th className="px-4 py-3 font-semibold">
                  {naFila ? "Esperando" : "Saída / situação"}
                </th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.map((r, index) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  {naFila ? (
                    <td className="px-4 py-3 text-sm font-bold tabular-nums text-slate-400">
                      {index + 1}
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <Link
                      href={`/encaminhamentos/${r.id}`}
                      className="font-medium text-slate-900 hover:text-teal-700"
                    >
                      {r.patient?.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {referralKinds[r.kind]}
                      {r.specialty ? ` de ${r.specialty}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.destinationCity}</td>
                  <td className="px-4 py-3">
                    <Badge className={urgency[r.urgency]?.badge}>{urgency[r.urgency]?.label}</Badge>
                    <span className="ml-1.5 text-[11px] tabular-nums text-slate-400">
                      {r.score} pts
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {naFila ? (
                      `há ${daysSince(r.queueSince)} dia(s)`
                    ) : r.seat?.trip ? (
                      <>
                        {formatDateTime(r.seat.trip.departureAt)}
                        <p className="text-slate-400">{r.seat.trip.vehicle}</p>
                      </>
                    ) : (
                      <Badge className={referralStatus[r.status]?.badge}>
                        {referralStatus[r.status]?.label}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {r.status === "AGUARDANDO_VAGA" ? (
                        <Button
                          size="sm"
                          disabled={busyId === r.id}
                          onClick={async () => {
                            setBusyId(r.id);
                            const ok = await darVaga(r);
                            if (ok) reload();
                            setBusyId(null);
                          }}
                        >
                          {busyId === r.id ? "Dando vaga..." : "Dar vaga"}
                        </Button>
                      ) : null}
                      <Link href={`/encaminhamentos/${r.id}`}>
                        <Button size="sm" variant="secondary">
                          Abrir
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function EncaminhamentosPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Fila />
    </Suspense>
  );
}

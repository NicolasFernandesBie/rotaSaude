"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPhone, age } from "@/lib/format";
import { referralStatus } from "@/lib/status";
import type { Patient, Referral } from "@/lib/types";
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

function situacao(p: Patient): { label: string; badge: string } {
  const refs = p.referrals || [];
  const find = (status: string) => refs.some((r) => r.status === status);
  if (find("EM_VIAGEM")) return { label: "Em viagem", badge: "bg-indigo-100 text-indigo-800" };
  if (find("CONFIRMADO")) return { label: "Com vaga", badge: "bg-sky-100 text-sky-800" };
  if (find("AGUARDANDO_VAGA")) return { label: "Na fila", badge: "bg-amber-100 text-amber-800" };
  if (refs[0]) return referralStatus[refs[0].status] || { label: "—", badge: "bg-slate-100 text-slate-600" };
  return { label: "Sem encaminhamento", badge: "bg-slate-100 text-slate-500" };
}

export default function PessoasPage() {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const { data, error, loading } = useApi<Patient[]>(
    `/api/patients${term ? `?search=${encodeURIComponent(term)}` : ""}`,
  );

  return (
    <div>
      <PageHeader
        title="Pessoas"
        subtitle="Todos os pacientes cadastrados e a situação de cada um"
        actions={
          <Link href="/novo">
            <Button>+ Novo atendimento</Button>
          </Link>
        }
      />

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setTerm(search.trim());
        }}
      >
        <input
          className={inputClass}
          placeholder="Buscar por nome, telefone, CPF ou posto..."
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
      ) : !data || data.length === 0 ? (
        <Empty title="Nenhum paciente encontrado" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Paciente</th>
                <th className="px-4 py-3 font-semibold">Telefone</th>
                <th className="px-4 py-3 font-semibold">Posto de saúde</th>
                <th className="px-4 py-3 font-semibold">Situação</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((p) => {
                const s = situacao(p);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/pacientes/${p.id}`}
                        className="font-medium text-slate-900 hover:text-teal-700"
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs text-slate-400">
                        {age(p.birthDate) !== null
                          ? `${age(p.birthDate)} anos`
                          : "idade não informada"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatPhone(p.phone)}</td>
                    <td className="px-4 py-3 text-slate-600">{p.healthPost}</td>
                    <td className="px-4 py-3">
                      <Badge className={s.badge}>{s.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/pacientes/${p.id}`}>
                        <Button size="sm" variant="secondary">
                          Abrir
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

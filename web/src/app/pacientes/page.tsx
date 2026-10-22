"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPhone, age } from "@/lib/format";
import { patientSituation } from "@/features/patients/status";
import type { Patient } from "@/features/patients/types";
import { useApi } from "@/lib/useApi";
import {
  Badge,
  Button,
  Empty,
  ErrorBox,
  PageHeader,
  SearchForm,
  Spinner,
} from "@/components/ui";

export default function PessoasPage() {
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

      <SearchForm
        placeholder="Buscar por nome, telefone, CPF ou posto..."
        onSubmit={setTerm}
      />

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
                const s = patientSituation(p);
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

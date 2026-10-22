"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { age, daysSince, formatDateTime, formatDate, formatPhone } from "@/lib/format";
import { mobilityLabels, referralKinds, referralStatus, urgency } from "@/lib/status";
import type { Patient } from "@/features/patients/types";
import { useApi } from "@/lib/useApi";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  PageHeader,
  Spinner,
} from "@/components/ui";

export default function PacienteDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, loading } = useApi<Patient>(`/api/patients/${params.id}`);

  if (loading) return <Spinner label="Carregando paciente..." />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;

  const referrals = data.referrals || [];

  return (
    <div>
      <PageHeader
        title={data.name}
        subtitle={`${data.healthPost} · ${data.city}`}
        actions={
          <>
            <Link href={`/pacientes/${data.id}/editar`}>
              <Button variant="secondary">Editar cadastro</Button>
            </Link>
            <Link href={`/novo?patientId=${data.id}`}>
              <Button>Novo atendimento</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Dados do paciente
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Telefone</dt>
              <dd className="font-medium text-slate-800">{formatPhone(data.phone)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Idade</dt>
              <dd className="font-medium text-slate-800">
                {age(data.birthDate) !== null ? `${age(data.birthDate)} anos` : "não informada"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">CPF / Cartão SUS</dt>
              <dd className="font-medium text-slate-800">
                {data.cpf || "—"} {data.susCard ? `· ${data.susCard}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Mobilidade</dt>
              <dd>
                <Badge
                  className={
                    data.mobility === "CADEIRANTE"
                      ? "bg-indigo-100 text-indigo-800"
                      : data.mobility === "APOIO"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                  }
                >
                  {mobilityLabels[data.mobility]}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Endereço</dt>
              <dd className="font-medium text-slate-800">{data.address || "—"}</dd>
            </div>
            {data.notes ? (
              <div>
                <dt className="text-xs text-slate-400">Observações</dt>
                <dd className="text-slate-700">{data.notes}</dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Encaminhamentos ({referrals.length})
            </h2>
            <button
              onClick={() => router.push("/encaminhamentos")}
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              Ver fila completa
            </button>
          </div>
          {referrals.length === 0 ? (
            <Empty
              title="Nenhum encaminhamento"
              hint="Use o botão 'Novo atendimento' para começar."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {referrals.map((r) => (
                <li key={r.id} className="py-3">
                  <Link href={`/encaminhamentos/${r.id}`} className="group block">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={referralStatus[r.status]?.badge}>
                        {referralStatus[r.status]?.label}
                      </Badge>
                      <Badge className={urgency[r.urgency]?.badge}>{urgency[r.urgency]?.label}</Badge>
                      <span className="text-sm font-medium text-slate-900 group-hover:text-teal-700">
                        {referralKinds[r.kind]}
                        {r.specialty ? ` · ${r.specialty}` : ""}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      → {r.destinationUnit} ({r.destinationCity}) · solicitado em{" "}
                      {formatDate(r.requestedAt)}
                      {r.status === "AGUARDANDO_VAGA"
                        ? ` · ${daysSince(r.queueSince)}d na fila`
                        : ""}
                      {r.seat?.trip
                        ? ` · saída ${formatDateTime(r.seat.trip.departureAt)}`
                        : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

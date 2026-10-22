"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CIDADES, CIDADE_DESTINO_PADRAO } from "@/config/cities";
import { formatPhone } from "@/lib/format";
import { showToast } from "@/lib/toast";
import type { Patient } from "@/features/patients/types";
import type { Referral } from "@/features/referrals/types";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  PageHeader,
  Spinner,
  inputClass,
} from "@/components/ui";

const cidades = CIDADES;
const especialidades = [
  "Cardiologia",
  "Nefrologia",
  "Ortopedia",
  "Ginecologia",
  "Endocrinologia",
  "Neurologia",
  "Oftalmologia",
  "Oncologia",
  "Ressonância magnética",
  "Tomografia",
  "Ultrassonografia",
  "Hemodiálise",
  "Quimioterapia",
  "Fisioterapia",
];

const urgencias = [
  { key: "CRITICA", label: "Crítica", hint: "o quanto antes", className: "border-rose-300 bg-rose-50 text-rose-800" },
  { key: "ALTA", label: "Alta", hint: "nos próximos dias", className: "border-orange-300 bg-orange-50 text-orange-800" },
  { key: "MEDIA", label: "Média", hint: "semana que vem", className: "border-amber-300 bg-amber-50 text-amber-900" },
  { key: "BAIXA", label: "Baixa", hint: "quando houver vaga", className: "border-slate-300 bg-slate-50 text-slate-700" },
];

function NovoAtendimento() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("patientId");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [novo, setNovo] = useState({ name: "", phone: "", healthPost: "", city: "Avaré" });
  const [form, setForm] = useState({
    kind: "CONSULTA",
    specialty: "",
    destinationCity: CIDADE_DESTINO_PADRAO,
    destinationUnit: "",
    urgency: "MEDIA",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!preselectedId) return;
    api<Patient>(`/api/patients/${preselectedId}`)
      .then(setSelected)
      .catch(() => setError("Paciente não encontrado. Busque novamente."));
  }, [preselectedId]);

  useEffect(() => {
    if (!query.trim() || selected) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const list = await api<Patient[]>(`/api/patients?search=${encodeURIComponent(query.trim())}`);
        setResults(list.slice(0, 6));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, selected]);

  const pacientePronto =
    selected ||
    (mostrarCadastro && novo.name.trim() && novo.phone.trim() && novo.healthPost.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!pacientePronto) {
      setError("Escolha ou cadastre o paciente.");
      return;
    }
    if (!form.destinationCity.trim()) {
      setError("Informe a cidade de destino.");
      return;
    }
    setSaving(true);
    try {
      let patientId = selected?.id;
      let nome = selected?.name || novo.name;
      if (!patientId) {
        const created = await api<Patient>("/api/patients", { method: "POST", body: novo });
        patientId = created.id;
        nome = created.name;
      }
      await api<Referral>("/api/referrals", {
        method: "POST",
        body: {
          patientId,
          kind: form.kind,
          specialty: form.specialty || null,
          destinationCity: form.destinationCity.trim(),
          destinationUnit: form.destinationUnit.trim() || null,
          urgency: form.urgency,
        },
      });
      showToast({
        message: `${nome.split(" ")[0]} entrou na fila para ${form.destinationCity}.`,
      });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Novo atendimento"
        subtitle="Cadastre o paciente e o que ele precisa — em uma única tela"
      />

      {error ? (
        <div className="mb-4">
          <ErrorBox message={error} />
        </div>
      ) : null}

      <form onSubmit={submit} className="space-y-4">
        <Card className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            1. Quem é o paciente?
          </h2>

          {selected ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{selected.name}</p>
                <p className="text-xs text-slate-500">
                  {formatPhone(selected.phone)} · {selected.healthPost}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                }}
                className="text-xs font-medium text-teal-700 hover:underline"
              >
                Trocar paciente
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <div className="relative">
                <input
                  className={inputClass}
                  placeholder="Digite o nome do paciente..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
                {searching ? (
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400">buscando...</span>
                ) : null}
                {results.length > 0 ? (
                  <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    {results.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(p);
                            setMostrarCadastro(false);
                            setResults([]);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-teal-50"
                        >
                          <span className="font-medium text-slate-800">{p.name}</span>
                          <span className="text-xs text-slate-400">{p.healthPost}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {!mostrarCadastro ? (
                <button
                  type="button"
                  onClick={() => {
                    setMostrarCadastro(true);
                    setNovo((n) => ({ ...n, name: query.trim() }));
                  }}
                  className="mt-2 text-xs font-medium text-teal-700 hover:underline"
                >
                  Não encontrou? Cadastrar novo paciente
                </button>
              ) : (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Nome completo *" className="sm:col-span-2">
                      <input
                        className={inputClass}
                        value={novo.name}
                        onChange={(e) => setNovo({ ...novo, name: e.target.value })}
                      />
                    </Field>
                    <Field label="Telefone / WhatsApp *">
                      <input
                        className={inputClass}
                        placeholder="(15) 99999-0000"
                        value={novo.phone}
                        onChange={(e) => setNovo({ ...novo, phone: e.target.value })}
                      />
                    </Field>
                    <Field label="Posto de saúde *">
                      <input
                        className={inputClass}
                        placeholder="UBS Centro"
                        value={novo.healthPost}
                        onChange={(e) => setNovo({ ...novo, healthPost: e.target.value })}
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMostrarCadastro(false)}
                    className="mt-2 text-xs text-slate-500 hover:underline"
                  >
                    Voltar para a busca
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            2. O que ele precisa?
          </h2>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tipo
              </span>
              <div className="flex gap-2">
                {[
                  ["CONSULTA", "Consulta"],
                  ["EXAME", "Exame"],
                  ["TRATAMENTO", "Tratamento"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, kind: value })}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      form.kind === value
                        ? "border-teal-600 bg-teal-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Especialidade / exame (opcional)">
              <input
                className={inputClass}
                list="especialidades"
                placeholder="Cardiologia, ressonância..."
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              />
              <datalist id="especialidades">
                {especialidades.map((e) => (
                  <option key={e} value={e} />
                ))}
              </datalist>
            </Field>

            <Field label="Cidade de destino *">
              <select
                className={inputClass}
                required
                value={form.destinationCity}
                onChange={(e) => setForm({ ...form, destinationCity: e.target.value })}
              >
                {cidades.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Hospital / clínica (opcional)" className="sm:col-span-2">
              <input
                className={inputClass}
                placeholder="Se não souber, deixe em branco"
                value={form.destinationUnit}
                onChange={(e) => setForm({ ...form, destinationUnit: e.target.value })}
              />
            </Field>

            <div className="sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Urgência
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {urgencias.map((u) => (
                  <button
                    key={u.key}
                    type="button"
                    onClick={() => setForm({ ...form, urgency: u.key })}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                      form.urgency === u.key
                        ? u.className
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{u.label}</span>
                    <span className="block text-[11px] opacity-75">{u.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-2">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? "Salvando..." : "Colocar na fila"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/")}>
            Cancelar
          </Button>
          <span className="ml-auto hidden text-xs text-slate-400 sm:block">
            A prioridade é calculada automaticamente
          </span>
        </div>
      </form>
    </div>
  );
}

export default function NovoAtendimentoPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <NovoAtendimento />
    </Suspense>
  );
}

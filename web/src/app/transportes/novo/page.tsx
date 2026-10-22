"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api";
import { CIDADES, CIDADE_DESTINO_PADRAO, CIDADE_ORIGEM_PADRAO, isCidadeValida } from "@/config/cities";
import { showToast } from "@/lib/toast";
import type { Trip } from "@/features/trips/types";
import {
  Button,
  Card,
  ErrorBox,
  Field,
  PageHeader,
  Spinner,
  inputClass,
} from "@/components/ui";
import { toDatetimeLocal } from "@/lib/format";

const defaultDeparture = () => {
  const d = new Date(Date.now() + 24 * 3_600_000);
  d.setMinutes(0, 0, 0);
  return toDatetimeLocal(d.toISOString());
};

function NovaViagem() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cityParam = searchParams.get("city");
  const [form, setForm] = useState({
    departureAt: defaultDeparture(),
    originCity: CIDADE_ORIGEM_PADRAO,
    destinationCity:
      cityParam && isCidadeValida(cityParam) ? cityParam : CIDADE_DESTINO_PADRAO,
    vehicle: "",
    driver: "",
    phone: "",
    capacity: "8",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const trip = await api<Trip>("/api/trips", {
        method: "POST",
        body: { ...form, capacity: Number(form.capacity) },
      });
      showToast({
        message: "Viagem criada. Dê vaga às pessoas da fila.",
      });
      router.push(`/transportes/${trip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar viagem");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Nova viagem"
        subtitle="Defina rota, horário de saída e capacidade do veículo"
      />
      {error ? (
        <div className="mb-4">
          <ErrorBox message={error} />
        </div>
      ) : null}
      <form onSubmit={submit}>
        <Card className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Data e horário de saída *" className="sm:col-span-1">
              <input
                type="datetime-local"
                className={inputClass}
                required
                value={form.departureAt}
                onChange={set("departureAt")}
              />
            </Field>
            <Field label="Capacidade (vagas) *">
              <input
                type="number"
                min={1}
                max={60}
                className={inputClass}
                required
                value={form.capacity}
                onChange={set("capacity")}
              />
            </Field>
            <Field label="Cidade de origem *">
              <select className={inputClass} required value={form.originCity} onChange={set("originCity")}>
                {CIDADES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cidade de destino *">
              <select
                className={inputClass}
                required
                value={form.destinationCity}
                onChange={set("destinationCity")}
              >
                {CIDADES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Veículo *">
              <input
                className={inputClass}
                required
                placeholder="Van TFD-01 (WEG)"
                value={form.vehicle}
                onChange={set("vehicle")}
              />
            </Field>
            <Field label="Motorista *">
              <input className={inputClass} required value={form.driver} onChange={set("driver")} />
            </Field>
            <Field label="Telefone do motorista">
              <input className={inputClass} placeholder="(14) 99999-0000" value={form.phone} onChange={set("phone")} />
            </Field>
            <Field label="Observações" className="sm:col-span-2">
              <textarea
                className={inputClass}
                rows={2}
                value={form.notes}
                onChange={set("notes")}
                placeholder="Ponto de encontro, observações da rota..."
              />
            </Field>
          </div>
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-3">
            <span className="block text-sm font-semibold text-teal-900">
              A volta faz parte desta viagem
            </span>
            <span className="block text-xs text-teal-700">
              A mesma viagem inclui a ida e a volta ({form.destinationCity} → {form.originCity}).
              O horário da volta é informado ao iniciá-la. Quem não comparecer na ida não segue na
              volta.
            </span>
          </div>
        </Card>
        <div className="mt-4 flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Criando..." : "Criar viagem"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NovaViagemPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <NovaViagem />
    </Suspense>
  );
}

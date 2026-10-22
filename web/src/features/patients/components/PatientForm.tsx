"use client";

import { useState } from "react";
import type { Patient } from "@/features/patients/types";
import { Button, Card, Field, inputClass } from "@/components/ui";

export type PatientValues = {
  name: string;
  cpf: string;
  susCard: string;
  phone: string;
  birthDate: string;
  city: string;
  address: string;
  healthPost: string;
  mobility: string;
  notes: string;
};

const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");

export function PatientForm({
  initial,
  onSubmit,
  submitLabel = "Salvar paciente",
  footer,
}: {
  initial?: Patient | null;
  onSubmit: (values: PatientValues) => Promise<void>;
  submitLabel?: string;
  footer?: React.ReactNode;
}) {
  const [form, setForm] = useState<PatientValues>({
    name: initial?.name ?? "",
    cpf: initial?.cpf ?? "",
    susCard: initial?.susCard ?? "",
    phone: initial?.phone ?? "",
    birthDate: toDateInput(initial?.birthDate),
    city: initial?.city ?? "Avaré",
    address: initial?.address ?? "",
    healthPost: initial?.healthPost ?? "",
    mobility: initial?.mobility ?? "INDEPENDENTE",
    notes: initial?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set =
    (key: keyof PatientValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo *" className="sm:col-span-2">
            <input className={inputClass} required value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Telefone / WhatsApp *">
            <input
              className={inputClass}
              required
              placeholder="(15) 99999-0000"
              value={form.phone}
              onChange={set("phone")}
            />
          </Field>
          <Field label="Data de nascimento">
            <input type="date" className={inputClass} value={form.birthDate} onChange={set("birthDate")} />
          </Field>
          <Field label="CPF">
            <input className={inputClass} value={form.cpf} onChange={set("cpf")} />
          </Field>
          <Field label="Cartão SUS">
            <input className={inputClass} value={form.susCard} onChange={set("susCard")} />
          </Field>
          <Field label="Posto de saúde *" className="sm:col-span-2">
            <input
              className={inputClass}
              required
              placeholder="UBS Centro, UBS Vila Hortência..."
              value={form.healthPost}
              onChange={set("healthPost")}
            />
          </Field>
          <Field label="Cidade *">
            <input className={inputClass} required value={form.city} onChange={set("city")} />
          </Field>
          <Field label="Endereço">
            <input className={inputClass} value={form.address} onChange={set("address")} />
          </Field>
          <Field label="Necessidade de mobilidade">
            <select className={inputClass} value={form.mobility} onChange={set("mobility")}>
              <option value="INDEPENDENTE">Independente</option>
              <option value="APOIO">Precisa de apoio</option>
              <option value="CADEIRANTE">Cadeirante</option>
            </select>
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            <textarea
              className={inputClass}
              rows={3}
              value={form.notes}
              onChange={set("notes")}
              placeholder="Acompanhante, condição clínica relevante..."
            />
          </Field>
        </div>
      </Card>
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : submitLabel}
        </Button>
        {footer}
      </div>
    </form>
  );
}

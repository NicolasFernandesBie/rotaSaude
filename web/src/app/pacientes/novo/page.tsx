"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PatientForm, type PatientValues } from "@/features/patients/components/PatientForm";
import { api } from "@/lib/api";
import type { Patient } from "@/features/patients/types";
import { Button, ErrorBox, PageHeader } from "@/components/ui";

export default function NovoPacientePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function submit(values: PatientValues) {
    setError(null);
    try {
      const patient = await api<Patient>("/api/patients", { method: "POST", body: values });
      router.push(`/pacientes/${patient.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar paciente");
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo paciente" subtitle="Cadastro rápido com os dados essenciais" />
      {error ? <div className="mb-4"><ErrorBox message={error} /></div> : null}
      <PatientForm
        onSubmit={submit}
        footer={
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
        }
      />
    </div>
  );
}

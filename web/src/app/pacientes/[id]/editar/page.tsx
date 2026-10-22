"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { PatientForm, type PatientValues } from "@/features/patients/components/PatientForm";
import { api } from "@/lib/api";
import type { Patient } from "@/features/patients/types";
import { useApi } from "@/lib/useApi";
import { Button, ErrorBox, PageHeader, Spinner } from "@/components/ui";

export default function EditarPacientePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, loading } = useApi<Patient>(`/api/patients/${params.id}`);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function submit(values: PatientValues) {
    setSaveError(null);
    try {
      await api(`/api/patients/${params.id}`, { method: "PUT", body: values });
      router.push(`/pacientes/${params.id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao atualizar paciente");
    }
  }

  if (loading) return <Spinner label="Carregando paciente..." />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Editar paciente" subtitle={data.name} />
      {saveError ? <div className="mb-4"><ErrorBox message={saveError} /></div> : null}
      <PatientForm
        initial={data}
        onSubmit={submit}
        submitLabel="Salvar alterações"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Link href={`/pacientes/${data.id}`}>
              <Button type="button" variant="ghost">
                Voltar ao cadastro
              </Button>
            </Link>
          </>
        }
      />
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Spinner } from "@/components/ui";

function Redirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const patientId = searchParams.get("patientId");
    router.replace(patientId ? `/novo?patientId=${patientId}` : "/novo");
  }, [router, searchParams]);
  return <Spinner label="Abrindo formulário..." />;
}

export default function EncaminhamentoNovoRedirect() {
  return (
    <Suspense fallback={<Spinner />}>
      <Redirect />
    </Suspense>
  );
}

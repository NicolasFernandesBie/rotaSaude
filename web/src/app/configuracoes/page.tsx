"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Field,
  PageHeader,
  Spinner,
  inputClass,
} from "@/components/ui";

type Settings = { channel: string; reminderHours: number };

type ProviderStatus = {
  provider: "simulator" | "baileys";
  ready: boolean;
  simulated: boolean;
  connected: boolean;
  qr: string | null;
  self: string | null;
  missing: string[];
  detail: string;
};

const providerLabels: Record<ProviderStatus["provider"], string> = {
  simulator: "Simulador",
  baileys: "Bot interno (WhatsApp Web)",
};

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [provider, setProvider] = useState<ProviderStatus | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [phoneCheck, setPhoneCheck] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api<Settings>("/api/settings")
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar"));
    api<ProviderStatus>("/api/notifications/provider")
      .then(setProvider)
      .catch(() => setProvider(null));
  }, []);

  useEffect(() => {
    if (provider?.provider !== "baileys" || provider.connected) return;
    const timer = setInterval(() => {
      api<ProviderStatus>("/api/notifications/provider")
        .then(setProvider)
        .catch(() => undefined);
    }, 3000);
    return () => clearInterval(timer);
  }, [provider?.provider, provider?.connected]);

  async function sendTest(e: React.FormEvent) {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api<{
        ok: boolean;
        provider: string;
        simulated?: boolean;
        id?: string;
      }>("/api/notifications/test", {
        method: "POST",
        body: { to: testPhone, message: testMessage },
      });
      setTestResult({
        ok: true,
        text: result.simulated
          ? "Envio simulado registrado. Ative o bot (WHATSAPP_PROVIDER=baileys) para enviar de verdade."
          : `Mensagem enviada pelo WhatsApp${result.id ? ` (id ${result.id})` : ""}.`,
      });
    } catch (err) {
      setTestResult({
        ok: false,
        text: err instanceof Error ? err.message : "Falha ao enviar a mensagem de teste",
      });
    } finally {
      setTesting(false);
    }
  }

  async function checkPhone() {
    setChecking(true);
    setPhoneCheck(null);
    try {
      const result = await api<{
        exists: boolean | null;
        simulated?: boolean;
        jid?: string;
        error?: string;
      }>("/api/notifications/check", { method: "POST", body: { to: testPhone } });
      if (result.simulated) {
        setPhoneCheck({ ok: true, text: "Modo simulado: verificação real indisponível." });
      } else if (result.exists) {
        setPhoneCheck({
          ok: true,
          text: `Número encontrado no WhatsApp${result.jid ? ` (${result.jid.split("@")[0]})` : ""}.`,
        });
      } else {
        setPhoneCheck({
          ok: false,
          text: result.error || "Número não encontrado no WhatsApp.",
        });
      }
    } catch (err) {
      setPhoneCheck({
        ok: false,
        text: err instanceof Error ? err.message : "Falha ao verificar o número",
      });
    } finally {
      setChecking(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api<Settings>("/api/settings", {
        method: "PUT",
        body: settings,
      });
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  }

  if (error && !settings) return <ErrorBox message={error} />;
  if (!settings) return <Spinner label="Carregando configurações..." />;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Configurações"
        subtitle="Padrões de notificação automática da plataforma"
      />
      {error ? (
        <div className="mb-4">
          <ErrorBox message={error} />
        </div>
      ) : null}

      <form onSubmit={save}>
        <Card className="space-y-4 p-5">
          <Field label="Canal padrão de notificação">
            <select
              className={inputClass}
              value={settings.channel}
              onChange={(e) => setSettings((s) => ({ ...s!, channel: e.target.value }))}
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="SMS">SMS</option>
            </select>
          </Field>
          <Field
            label="Antecedência do lembrete de saída"
            hint="Horas antes da saída que o paciente recebe a mensagem de lembrete"
          >
            <input
              type="number"
              min={1}
              max={168}
              className={inputClass}
              value={settings.reminderHours}
              onChange={(e) =>
                setSettings((s) => ({ ...s!, reminderHours: Number(e.target.value) }))
              }
            />
          </Field>
        </Card>
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar configurações"}
          </Button>
          {saved ? <span className="text-sm text-emerald-600">Configurações salvas.</span> : null}
        </div>
      </form>

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Envio de WhatsApp
          </h2>
          {provider ? (
            <Badge
              className={
                provider.simulated
                  ? "bg-amber-100 text-amber-800"
                  : provider.connected
                    ? "bg-emerald-100 text-emerald-800"
                    : provider.qr
                      ? "bg-sky-100 text-sky-800"
                      : "bg-slate-100 text-slate-700"
              }
            >
              {provider.simulated
                ? "Simulado (sem envio real)"
                : provider.connected
                  ? "Conectado"
                  : provider.qr
                    ? "Aguardando QR code"
                    : "Conectando..."}
            </Badge>
          ) : null}
        </div>

        {provider ? (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-slate-600">
              Provedor:{" "}
              <span className="font-medium text-slate-800">{providerLabels[provider.provider]}</span>{" "}
              · {provider.detail}
            </p>
            {provider.missing.length > 0 ? (
              <p className="text-xs text-rose-600">
                Faltam: {provider.missing.join(", ")}. Reinicie a API após configurar.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500">Não foi possível consultar o provedor.</p>
        )}

        {provider?.qr ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-start">
            <img
              src={provider.qr}
              alt="QR code para conectar o WhatsApp"
              className="h-52 w-52 rounded bg-white p-1"
            />
            <div className="text-sm text-slate-700">
              <p className="font-medium">Conecte o WhatsApp do celular</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                No celular: <strong>WhatsApp → Dispositivos conectados → Conectar dispositivo</strong> e
                aponte a câmera para o código. Use um número reservado para a demonstração. Esta tela
                atualiza sozinha quando a conexão abrir.
              </p>
            </div>
          </div>
        ) : null}

        <form onSubmit={sendTest} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Telefone com DDD *">
            <input
              className={inputClass}
              placeholder="(15) 99999-0000"
              required
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
          </Field>
          <Field label="Mensagem (opcional)">
            <input
              className={inputClass}
              placeholder="Deixe em branco para usar a mensagem padrão"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button
              type="submit"
              disabled={testing || (provider?.provider === "baileys" && !provider.connected)}
            >
              {testing ? "Enviando..." : "Enviar mensagem de teste"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={checkPhone}
              disabled={
                checking ||
                !testPhone ||
                (provider?.provider === "baileys" && !provider.connected)
              }
            >
              {checking ? "Verificando..." : "Verificar número"}
            </Button>
            {provider?.provider === "baileys" && !provider.connected ? (
              <span className="text-sm text-slate-500">
                Escaneie o QR code acima para liberar o envio.
              </span>
            ) : null}
            {testResult ? (
              <span
                className={`text-sm ${testResult.ok ? "text-emerald-600" : "text-rose-600"}`}
              >
                {testResult.text}
              </span>
            ) : null}
            {phoneCheck ? (
              <span
                className={`text-sm ${phoneCheck.ok ? "text-emerald-600" : "text-rose-600"}`}
              >
                {phoneCheck.text}
              </span>
            ) : null}
          </div>
        </form>

        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          O bot roda dentro da própria API (Baileys, base do WhatsApp Web): não usa a API da Meta
          nem serviço externo. Na primeira conexão, escaneie o QR code; a sessão fica salva no
          volume <code className="rounded bg-slate-100 px-1">/data/baileys</code> do Docker e
          reconecta sozinha. Por ser não oficial, use um número reservado e envie em baixo volume.
          Os telefones do seed são fictícios, mas podem existir no WhatsApp: para demonstrar,
          prefira o teste acima. Ele também aparece em <strong>Mensagens enviadas</strong>.
        </p>
      </Card>

      <Card className="mt-6 border-slate-200 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Sobre as notificações
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Os disparos são processados automaticamente pelo servidor a cada poucos segundos:
          confirmação ao alocar a vaga, lembrete antes da saída, avisos de alteração ou
          cancelamento e mensagem de conclusão da viagem. O canal WhatsApp usa o bot integrado
          quando <code className="rounded bg-slate-100 px-1">WHATSAPP_PROVIDER=baileys</code>; sem
          essa configuração ele roda em{" "}
          <span className="font-medium text-slate-800">modo simulado</span> (com log completo e
          possibilidade de reenvio). O canal SMS permanece simulado.
        </p>
      </Card>
    </div>
  );
}

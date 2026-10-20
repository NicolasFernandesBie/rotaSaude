import { toWhatsAppNumber } from "./phone";
import { checkBaileysNumber, ensureBaileys, getBaileysStatus, sendBaileys } from "./baileys";

export type WhatsAppProviderName = "simulator" | "baileys";

export type SendResult = {
  ok: boolean;
  provider: WhatsAppProviderName;
  id?: string;
  error?: string;
  simulated?: boolean;
};

export function getWhatsAppConfig() {
  const raw = (process.env.WHATSAPP_PROVIDER || "simulator").trim().toLowerCase();
  const provider: WhatsAppProviderName = raw === "baileys" ? "baileys" : "simulator";
  return { provider };
}

export function getWhatsAppProviderStatus() {
  const config = getWhatsAppConfig();

  if (config.provider === "simulator") {
    return {
      provider: config.provider,
      ready: true,
      simulated: true,
      connected: false,
      qr: null,
      self: null,
      missing: [] as string[],
      detail: "Mensagens registradas no sistema (nenhum envio real)",
    };
  }

  const status = getBaileysStatus();
  return {
    provider: config.provider,
    ready: status.connected,
    simulated: false,
    connected: status.connected,
    qr: status.qr,
    self: status.self,
    missing: [] as string[],
    detail: status.connected
      ? `Bot interno conectado${status.self ? ` como ${status.self}` : ""}`
      : status.qr
        ? "Aguardando leitura do QR code em Configuracoes"
        : status.error || "Conectando ao WhatsApp...",
  };
}

export async function sendWhatsApp(to: string, message: string): Promise<SendResult> {
  const config = getWhatsAppConfig();
  const number = toWhatsAppNumber(to);

  if (config.provider === "simulator") {
    await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 250));
    console.log(`[whatsapp simulado] -> ${number} | ${message}`);
    return { ok: true, provider: "simulator", simulated: true };
  }

  const result = await sendBaileys(number, message);
  return { ...result, provider: "baileys" };
}

export async function checkWhatsAppNumber(to: string) {
  const config = getWhatsAppConfig();
  const number = toWhatsAppNumber(to);

  if (config.provider === "simulator") {
    return { exists: null, simulated: true, error: "Modo simulado: verificacao indisponivel" };
  }

  const result = await checkBaileysNumber(number);
  return { ...result, simulated: false };
}

export function maybeStartWhatsApp() {
  if (getWhatsAppConfig().provider !== "baileys") return;
  ensureBaileys().catch((err) => {
    console.log(
      `[whatsapp] nao foi possivel iniciar: ${err instanceof Error ? err.message : String(err)}`,
    );
  });
}

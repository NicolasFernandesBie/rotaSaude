import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "baileys";
import pino from "pino";
import QRCode from "qrcode";

type Socket = ReturnType<typeof makeWASocket>;

export type BaileysStatus = {
  connected: boolean;
  qr: string | null;
  self: string | null;
  error: string | null;
};

let socket: Socket | null = null;
let connecting: Promise<void> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let connected = false;
let qr: string | null = null;
let self: string | null = null;
let lastError: string | null = null;
const sentIds = new Map<string, { to: string; at: number }>();
const NOTIFICATION_STATUS: Record<number, string> = {
  0: "ERRO",
  1: "PENDENTE",
  2: "SERVIDOR",
  3: "ENTREGUE",
  4: "LIDO",
  5: "REPRODUZIDO",
};

function sessionDir() {
  return process.env.BAILEYS_SESSION_DIR || path.resolve(process.cwd(), ".baileys");
}

function scheduleReconnect(delayMs: number) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    ensureBaileys().catch((err) => {
      lastError = err instanceof Error ? err.message : "Falha ao reconectar";
    });
  }, delayMs);
  reconnectTimer.unref?.();
}

async function start(): Promise<void> {
  const dir = sessionDir();
  await mkdir(dir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const version = await fetchLatestBaileysVersion()
    .then((result) => result.version)
    .catch(() => undefined);

  const sock = makeWASocket({
    auth: state,
    version,
    browser: ["Rota Saude", "Chrome", "1.0.0"],
    markOnlineOnConnect: false,
    logger: pino({ level: "silent" }),
  });
  socket = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.update", (updates) => {
    for (const update of updates) {
      const id = update.key?.id;
      if (!id || !sentIds.has(id)) continue;
      const status = update.update?.status;
      if (typeof status === "number") {
        console.log(`[whatsapp] mensagem ${id} -> ${NOTIFICATION_STATUS[status] || status}`);
      }
    }
  });

  sock.ev.on("message-receipt.update", (receipts) => {
    for (const receipt of receipts) {
      const id = receipt.key?.id;
      if (!id || !sentIds.has(id)) continue;
      console.log(`[whatsapp] recibo ${id} -> ${receipt.receipt.receiptTimestamp}`);
    }
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr: newQr } = update;

    if (newQr) {
      connected = false;
      lastError = null;
      QRCode.toDataURL(newQr, { width: 320, margin: 1 })
        .then((dataUrl) => {
          qr = dataUrl;
          console.log("[whatsapp] QR code pendente: abra Configuracoes no sistema para escanear");
        })
        .catch(() => {
          qr = null;
        });
    }

    if (connection === "open") {
      connected = true;
      qr = null;
      lastError = null;
      self = sock.user?.id ? sock.user.id.split(":")[0].split("@")[0] : null;
      console.log(`[whatsapp] conectado${self ? ` como ${self}` : ""}`);
    }

    if (connection === "close") {
      connected = false;
      self = null;
      const statusCode = (
        lastDisconnect?.error as { output?: { statusCode?: number } } | undefined
      )?.output?.statusCode;

      socket = null;

      if (statusCode === DisconnectReason.loggedOut) {
        qr = null;
        lastError = "Sessao encerrada; gerando um novo QR code...";
        console.log("[whatsapp] sessao encerrada (logout); limpando credenciais e gerando novo QR");
        void rm(sessionDir(), { recursive: true, force: true }).finally(() => {
          scheduleReconnect(2000);
        });
        return;
      }

      lastError = "Conexao caiu; reconectando em instantes...";
      console.log(
        `[whatsapp] conexao encerrada${statusCode ? ` (codigo ${statusCode})` : ""}; reconectando`,
      );
      scheduleReconnect(3000);
    }
  });
}

export async function ensureBaileys(): Promise<void> {
  if (connected && socket) return;
  if (connecting) return connecting;

  connecting = start()
    .catch((err) => {
      socket = null;
      lastError = err instanceof Error ? err.message : "Falha ao iniciar o WhatsApp";
      console.log(`[whatsapp] falha ao iniciar: ${lastError}`);
      scheduleReconnect(5000);
    })
    .finally(() => {
      connecting = null;
    });

  return connecting;
}

export function getBaileysStatus(): BaileysStatus {
  return { connected, qr, self, error: lastError };
}

export async function checkBaileysNumber(
  number: string,
): Promise<{ exists: boolean | null; jid?: string; error?: string }> {
  await ensureBaileys();

  if (!socket || !connected) {
    return {
      exists: null,
      error: qr
        ? "WhatsApp aguardando leitura do QR code (Configuracoes > Envio de WhatsApp)"
        : lastError || "WhatsApp ainda conectando; tente novamente em alguns segundos",
    };
  }

  try {
    const result = await Promise.race([
      socket.onWhatsApp(number),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
    if (result === null) return { exists: null, error: "Consulta ao WhatsApp expirou" };
    const match = result?.[0];
    return { exists: Boolean(match?.exists), jid: match?.jid };
  } catch (err) {
    return {
      exists: null,
      error: err instanceof Error ? err.message : "falha ao consultar o WhatsApp",
    };
  }
}

export async function sendBaileys(
  number: string,
  message: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  await ensureBaileys();

  if (!socket || !connected) {
    return {
      ok: false,
      error: qr
        ? "WhatsApp aguardando leitura do QR code (Configuracoes > Envio de WhatsApp)"
        : lastError || "WhatsApp ainda conectando; tente novamente em alguns segundos",
    };
  }

  const check = await checkBaileysNumber(number);
  if (check.exists === false) {
    return {
      ok: false,
      error: `Numero ${number} nao encontrado no WhatsApp (confira DDD e o nono digito)`,
    };
  }

  const jid = check.jid || `${number}@s.whatsapp.net`;

  try {
    const sent = await socket.sendMessage(jid, { text: message });
    const id = sent?.key?.id;
    if (id) {
      sentIds.set(id, { to: number, at: Date.now() });
      setTimeout(() => sentIds.delete(id), 10 * 60_000).unref?.();
    }
    console.log(`[whatsapp] enviado id=${id || "?"} -> ${number} (${jid.split("@")[0]})`);
    return { ok: true, id: id ?? undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "falha ao enviar pelo WhatsApp",
    };
  }
}

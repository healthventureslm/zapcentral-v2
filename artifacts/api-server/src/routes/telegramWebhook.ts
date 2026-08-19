/**
 * Receptor de updates da Telegram Bot API.
 * Endpoint publico — autenticado pelo secret_token por bot.
 *
 * POST /api/webhooks/telegram/:botId
 *
 * O Telegram devolve o valor registrado em setWebhook no header
 * X-Telegram-Bot-Api-Secret-Token a cada request. Diferente do webhook da
 * Evolution, aqui o secret e sempre exigido: um bot so chega a ficar
 * 'connected' depois que registramos o webhook com secret.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { telegramBotsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { timingSafeEqual } from "crypto";
import { getFileUrl, displayName } from "../services/telegram";
import {
  handleInboundMessage,
  type InboundType,
} from "../services/inbound";

const router = Router();

// ---------------------------------------------------------------------------
// Formato do update (apenas o que consumimos)
// ---------------------------------------------------------------------------
interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface TelegramFileRef {
  file_id: string;
  mime_type?: string;
  file_name?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number; type: string };
  date: number;
  text?: string;
  caption?: string;
  photo?: TelegramFileRef[];
  document?: TelegramFileRef;
  voice?: TelegramFileRef;
  audio?: TelegramFileRef;
  video?: TelegramFileRef;
  video_note?: TelegramFileRef;
  sticker?: TelegramFileRef;
  location?: { latitude: number; longitude: number };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

/** Comparacao de segredo resistente a timing attack. */
function secretMatches(provided: unknown, expected: string): boolean {
  if (typeof provided !== "string") return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Normaliza o conteudo do update. Midia vira URL de download resolvida pelo
 * getFile — que embute o token do bot, por isso nunca e exposta ao cliente
 * sem passar pela API.
 */
async function extractContent(
  token: string,
  m: TelegramMessage,
): Promise<{
  type: InboundType;
  content: string | null;
  mediaUrl: string | null;
  mediaCaption: string | null;
  mediaMimeType: string | null;
  latitude: string | null;
  longitude: string | null;
}> {
  const base = {
    content: null as string | null,
    mediaUrl: null as string | null,
    mediaCaption: null as string | null,
    mediaMimeType: null as string | null,
    latitude: null as string | null,
    longitude: null as string | null,
  };

  if (m.text) {
    return { ...base, type: "text", content: m.text };
  }

  if (m.location) {
    return {
      ...base,
      type: "location",
      latitude: String(m.location.latitude),
      longitude: String(m.location.longitude),
    };
  }

  // A maior resolucao da foto vem por ultimo no array
  const photo = m.photo?.[m.photo.length - 1];
  const candidates: Array<[InboundType, TelegramFileRef | undefined]> = [
    ["image", photo],
    ["audio", m.voice ?? m.audio],
    ["video", m.video ?? m.video_note],
    ["sticker", m.sticker],
    ["document", m.document],
  ];

  for (const [type, ref] of candidates) {
    if (!ref) continue;
    return {
      ...base,
      type,
      content: m.document?.file_name ?? null,
      mediaUrl: await getFileUrl(token, ref.file_id),
      mediaCaption: m.caption ?? null,
      mediaMimeType: ref.mime_type ?? null,
    };
  }

  return { ...base, type: "text", content: null };
}

// ---------------------------------------------------------------------------
// POST /webhooks/telegram/:botId
// ---------------------------------------------------------------------------
router.post("/webhooks/telegram/:botId", async (req, res): Promise<void> => {
  const botRowId = Number(req.params["botId"]);
  if (!Number.isInteger(botRowId) || botRowId <= 0) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  const [bot] = await db
    .select()
    .from(telegramBotsTable)
    .where(eq(telegramBotsTable.id, botRowId))
    .limit(1);

  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  // Falha fechada: sem segredo configurado o webhook nao aceita nada.
  if (
    !bot.webhookSecret ||
    !secretMatches(req.headers["x-telegram-bot-api-secret-token"], bot.webhookSecret)
  ) {
    res.status(401).json({ error: "Invalid webhook secret" });
    return;
  }

  const update = req.body as TelegramUpdate;
  const message = update.message ?? update.edited_message;

  // Updates que nao tratamos (join, callback, etc.) sao confirmados e
  // descartados — devolver erro faria o Telegram reenviar indefinidamente.
  if (!message?.chat?.id) {
    res.status(200).json({ ok: true });
    return;
  }

  try {
    const parsed = await extractContent(bot.botToken, message);

    await handleInboundMessage({
      tenantId: bot.tenantId,
      channel: "telegram",
      externalId: String(message.chat.id),
      phone: null,
      displayName: message.from ? displayName(message.from) : null,
      // update_id no id garante unicidade tambem em mensagens editadas
      messageId: `tg_${message.message_id}_${update.update_id}`,
      timestamp: new Date(message.date * 1000),
      toIdentifier: bot.botId ?? bot.botUsername ?? "telegram-bot",
      ...parsed,
    });
  } catch (err) {
    req.log.error({ err }, "Telegram webhook processing error");
    // 500 faz o Telegram reenviar — preferivel a perder a mensagem.
    res.status(500).json({ error: "Processing failed" });
    return;
  }

  res.status(200).json({ ok: true });
});

export default router;

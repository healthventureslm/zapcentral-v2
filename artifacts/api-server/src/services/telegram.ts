/**
 * Cliente da Telegram Bot API.
 *
 * Diferente da Evolution, o token nao vem de env var: cada tenant registra o
 * proprio bot (tabela `telegram_bots`), entao todas as funcoes recebem o token
 * explicitamente.
 *
 * Docs: https://core.telegram.org/bots/api
 */

const API_ROOT = "https://api.telegram.org";

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

async function tgFetch<T>(
  token: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${API_ROOT}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = (await res.json().catch(() => null)) as
    | TelegramResponse<T>
    | null;

  if (!payload?.ok || payload.result === undefined) {
    // A descricao do Telegram e util e nao contem o token — seguro propagar.
    throw new Error(
      `Telegram API error on ${method}: ${payload?.description ?? res.status}`,
    );
  }

  return payload.result;
}

// ---------------------------------------------------------------------------
// Identidade do bot
// ---------------------------------------------------------------------------

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

/** Valida o token e devolve os dados do bot. Lanca se o token for invalido. */
export async function getMe(token: string): Promise<TelegramBotInfo> {
  return tgFetch<TelegramBotInfo>(token, "getMe");
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

/**
 * Registra o webhook. O `secretToken` volta em cada request no header
 * X-Telegram-Bot-Api-Secret-Token, e e como autenticamos o callback.
 */
export async function setWebhook(
  token: string,
  url: string,
  secretToken: string,
): Promise<boolean> {
  return tgFetch<boolean>(token, "setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "edited_message"],
    drop_pending_updates: true,
  });
}

export async function deleteWebhook(token: string): Promise<boolean> {
  return tgFetch<boolean>(token, "deleteWebhook", {
    drop_pending_updates: true,
  });
}

export interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_message?: string;
}

export async function getWebhookInfo(
  token: string,
): Promise<TelegramWebhookInfo> {
  return tgFetch<TelegramWebhookInfo>(token, "getWebhookInfo");
}

// ---------------------------------------------------------------------------
// Envio
// ---------------------------------------------------------------------------

export interface TelegramSentMessage {
  message_id: number;
  date: number;
}

/** Um botao do menu: o rotulo que a pessoa ve e a opcao que ele representa. */
export interface BotaoDoMenu {
  rotulo: string;
  /** O mesmo texto que a pessoa digitaria — "1", "2"... */
  valor: string;
}

export async function sendMessage(
  token: string,
  chatId: string,
  text: string,
  botoes?: BotaoDoMenu[],
): Promise<TelegramSentMessage> {
  return tgFetch<TelegramSentMessage>(token, "sendMessage", {
    chat_id: chatId,
    text,
    // Um botao por linha: nome de setor de hospital e longo e, lado a lado,
    // fica cortado no celular.
    ...(botoes?.length
      ? {
          reply_markup: {
            inline_keyboard: botoes.map((b) => [
              { text: b.rotulo, callback_data: b.valor },
            ]),
          },
        }
      : {}),
  });
}

/**
 * Confirma o toque no botao.
 *
 * O Telegram deixa o botao com um relogio girando ate a resposta chegar. Sem
 * isto ele fica girando por 30 segundos e a pessoa acha que travou.
 */
export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
): Promise<void> {
  try {
    await tgFetch(token, "answerCallbackQuery", {
      callback_query_id: callbackQueryId,
    });
  } catch {
    // Confirmacao visual apenas — falhar aqui nao pode derrubar o
    // processamento da escolha, que e o que realmente importa.
  }
}

/**
 * Remove os botoes de uma mensagem ja enviada.
 *
 * Depois de escolher um setor, o menu antigo continua tocavel no historico.
 * Sem limpar, a pessoa rola a conversa e toca de novo num menu que nao vale
 * mais.
 */
export async function removerBotoes(
  token: string,
  chatId: string,
  messageId: number,
): Promise<void> {
  try {
    await tgFetch(token, "editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    });
  } catch {
    // Cosmetico.
  }
}

/**
 * Envia midia por URL. O Telegram aceita uma URL publica direta e busca o
 * arquivo por conta propria.
 */
export async function sendMediaByUrl(
  token: string,
  chatId: string,
  url: string,
  kind: "image" | "audio" | "video" | "document",
  caption?: string | null,
): Promise<TelegramSentMessage> {
  const method =
    kind === "image"
      ? "sendPhoto"
      : kind === "audio"
        ? "sendAudio"
        : kind === "video"
          ? "sendVideo"
          : "sendDocument";

  const field =
    kind === "image"
      ? "photo"
      : kind === "audio"
        ? "audio"
        : kind === "video"
          ? "video"
          : "document";

  return tgFetch<TelegramSentMessage>(token, method, {
    chat_id: chatId,
    [field]: url,
    ...(caption ? { caption } : {}),
  });
}

// ---------------------------------------------------------------------------
// Arquivos recebidos
// ---------------------------------------------------------------------------

interface TelegramFile {
  file_id: string;
  file_path?: string;
}

/**
 * Resolve a URL de download de um arquivo recebido.
 *
 * Atencao: a URL retornada embute o token do bot. Nao expor ao frontend sem
 * proxy — quem tiver a URL tem controle total do bot.
 */
export async function getFileUrl(
  token: string,
  fileId: string,
): Promise<string | null> {
  try {
    const file = await tgFetch<TelegramFile>(token, "getFile", {
      file_id: fileId,
    });
    if (!file.file_path) return null;
    return `${API_ROOT}/file/bot${token}/${file.file_path}`;
  } catch {
    return null;
  }
}

/** Nome exibivel a partir dos campos que o Telegram fornece. */
export function displayName(from: {
  first_name?: string;
  last_name?: string;
  username?: string;
}): string | null {
  const full = [from.first_name, from.last_name].filter(Boolean).join(" ");
  return full || from.username || null;
}

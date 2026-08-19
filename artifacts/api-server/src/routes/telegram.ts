/**
 * Gestao do bot do Telegram por tenant.
 *
 * Diferente do WhatsApp (pareamento por QR), aqui o admin cola o token que o
 * BotFather gerou. Nos validamos com getMe e registramos o webhook.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { telegramBotsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { z } from "zod";
import {
  getMe,
  setWebhook,
  deleteWebhook,
  getWebhookInfo,
} from "../services/telegram";
import {
  requireAuth,
  requireTenantMember,
  requireTenantAdmin,
} from "../middlewares/auth";

const router = Router();

/**
 * Base publica para o webhook.
 *
 * O Telegram so aceita HTTPS, entao expor via ngrok (ou qualquer tunel) exige
 * a URL publica explicita: `req.get("host")` sozinho nao garante o esquema
 * correto atras de proxy. Ordem: PUBLIC_URL > dominio do Replit > host do
 * request (forcando https).
 */
function getPublicBaseUrl(req: import("express").Request): string {
  const explicit = process.env["PUBLIC_URL"];
  if (explicit) return explicit.replace(/\/$/, "");

  const devDomain = process.env["REPLIT_DEV_DOMAIN"];
  if (devDomain) return `https://${devDomain}/api-server`;

  return `https://${req.get("host")}`;
}

function webhookUrlFor(req: import("express").Request, botRowId: number): string {
  return `${getPublicBaseUrl(req)}/api/webhooks/telegram/${botRowId}`;
}

/** Token do BotFather: "<id numerico>:<35 chars>". */
const connectSchema = z.object({
  botToken: z
    .string()
    .trim()
    .regex(/^\d{6,}:[A-Za-z0-9_-]{30,}$/, "Formato de token inválido"),
});

/** Nunca devolver o token ao cliente — quem o tem controla o bot. */
function publicView(bot: typeof telegramBotsTable.$inferSelect) {
  return {
    id: bot.id,
    botId: bot.botId,
    botUsername: bot.botUsername,
    botFirstName: bot.botFirstName,
    status: bot.status,
    webhookUrl: bot.webhookUrl,
    lastError: bot.lastError,
    lastConnectedAt: bot.lastConnectedAt,
  };
}

// ---------------------------------------------------------------------------
// GET /api/tenants/:tenantId/telegram/status
// ---------------------------------------------------------------------------
router.get(
  "/tenants/:tenantId/telegram/status",
  requireAuth,
  requireTenantMember,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);

    const [bot] = await db
      .select()
      .from(telegramBotsTable)
      .where(eq(telegramBotsTable.tenantId, tenantId))
      .limit(1);

    if (!bot) {
      res.json({ connected: false, bot: null });
      return;
    }

    // Estado real no Telegram — util para detectar que a URL do tunel mudou
    let pendingUpdates: number | null = null;
    let remoteUrl: string | null = null;
    try {
      const info = await getWebhookInfo(bot.botToken);
      pendingUpdates = info.pending_update_count;
      remoteUrl = info.url;
    } catch {
      // Telegram indisponivel — devolvemos o estado local
    }

    res.json({
      connected: bot.status === "connected",
      bot: publicView(bot),
      remoteUrl,
      pendingUpdates,
      /** true quando o webhook registrado nao aponta mais para nos */
      webhookStale: remoteUrl !== null && remoteUrl !== bot.webhookUrl,
    });
  },
);

// ---------------------------------------------------------------------------
// POST /api/tenants/:tenantId/telegram/connect
// ---------------------------------------------------------------------------
router.post(
  "/tenants/:tenantId/telegram/connect",
  requireAuth,
  requireTenantAdmin,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);

    const parsed = connectSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.format() });
      return;
    }
    const { botToken } = parsed.data;

    // Valida o token antes de qualquer escrita
    let info;
    try {
      info = await getMe(botToken);
    } catch {
      res
        .status(400)
        .json({ error: "Token inválido ou bot inacessível no Telegram" });
      return;
    }

    const [existing] = await db
      .select()
      .from(telegramBotsTable)
      .where(eq(telegramBotsTable.tenantId, tenantId))
      .limit(1);

    const webhookSecret =
      existing?.webhookSecret ?? randomBytes(24).toString("hex");

    // A URL do webhook embute o id da linha, entao gravamos primeiro.
    const [saved] = existing
      ? await db
          .update(telegramBotsTable)
          .set({
            botToken,
            botId: String(info.id),
            botUsername: info.username ?? null,
            botFirstName: info.first_name,
            webhookSecret,
            status: "disconnected",
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(telegramBotsTable.id, existing.id))
          .returning()
      : await db
          .insert(telegramBotsTable)
          .values({
            tenantId,
            botToken,
            botId: String(info.id),
            botUsername: info.username ?? null,
            botFirstName: info.first_name,
            webhookSecret,
            status: "disconnected",
          })
          .returning();

    if (!saved) {
      res.status(500).json({ error: "Falha ao salvar o bot" });
      return;
    }

    const webhookUrl = webhookUrlFor(req, saved.id);

    try {
      await setWebhook(botToken, webhookUrl, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      await db
        .update(telegramBotsTable)
        .set({ status: "error", lastError: message, updatedAt: new Date() })
        .where(eq(telegramBotsTable.id, saved.id));
      res.status(502).json({
        error: `Bot validado, mas o Telegram recusou o webhook: ${message}`,
        hint: "A URL precisa ser HTTPS e acessível publicamente. Usando ngrok, defina PUBLIC_URL com a URL do túnel.",
      });
      return;
    }

    const [connected] = await db
      .update(telegramBotsTable)
      .set({
        status: "connected",
        webhookUrl,
        lastError: null,
        lastConnectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(telegramBotsTable.id, saved.id))
      .returning();

    res.status(201).json({ connected: true, bot: publicView(connected!) });
  },
);

// ---------------------------------------------------------------------------
// POST /api/tenants/:tenantId/telegram/refresh-webhook
// Re-registra o webhook na URL publica atual. Necessario sempre que o tunel
// muda de endereco (ngrok gratuito troca a cada restart).
// ---------------------------------------------------------------------------
router.post(
  "/tenants/:tenantId/telegram/refresh-webhook",
  requireAuth,
  requireTenantAdmin,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);

    const [bot] = await db
      .select()
      .from(telegramBotsTable)
      .where(eq(telegramBotsTable.tenantId, tenantId))
      .limit(1);

    if (!bot) {
      res.status(404).json({ error: "Nenhum bot configurado" });
      return;
    }

    const webhookSecret =
      bot.webhookSecret ?? randomBytes(24).toString("hex");
    const webhookUrl = webhookUrlFor(req, bot.id);

    try {
      await setWebhook(bot.botToken, webhookUrl, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      await db
        .update(telegramBotsTable)
        .set({ status: "error", lastError: message, updatedAt: new Date() })
        .where(eq(telegramBotsTable.id, bot.id));
      res.status(502).json({ error: message });
      return;
    }

    const [updated] = await db
      .update(telegramBotsTable)
      .set({
        status: "connected",
        webhookSecret,
        webhookUrl,
        lastError: null,
        lastConnectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(telegramBotsTable.id, bot.id))
      .returning();

    res.json({ connected: true, bot: publicView(updated!) });
  },
);

// ---------------------------------------------------------------------------
// DELETE /api/tenants/:tenantId/telegram/disconnect
// ---------------------------------------------------------------------------
router.delete(
  "/tenants/:tenantId/telegram/disconnect",
  requireAuth,
  requireTenantAdmin,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);

    const [bot] = await db
      .select()
      .from(telegramBotsTable)
      .where(eq(telegramBotsTable.tenantId, tenantId))
      .limit(1);

    if (!bot) {
      res.status(204).end();
      return;
    }

    // Falha aqui nao impede a desconexao local
    await deleteWebhook(bot.botToken).catch(() => null);

    await db
      .delete(telegramBotsTable)
      .where(eq(telegramBotsTable.id, bot.id));

    res.status(204).end();
  },
);

export default router;

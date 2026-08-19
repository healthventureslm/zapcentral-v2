/**
 * Evolution API webhook receiver.
 * Public endpoint — authenticated by X-Webhook-Secret per instance.
 *
 * POST /api/webhooks/evolution/:instanceName
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { whatsappInstancesTable, messagesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { jidToPhone } from "../services/evolution";
import { handleInboundMessage } from "../services/inbound";
import { emitToTenant } from "../services/socket";

const router = Router();

// ---------------------------------------------------------------------------
// Types for Evolution API webhook payload
// ---------------------------------------------------------------------------
interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: Record<string, unknown>;
}

interface MessageData {
  key: { remoteJid: string; id: string; fromMe: boolean };
  pushName?: string;
  message?: Record<string, unknown>;
  messageType?: string;
  messageTimestamp?: number;
}

interface MessageUpdateItem {
  key: { id: string; fromMe: boolean };
  update: { status?: number };
}

// ---------------------------------------------------------------------------
// Status code → our enum
// ---------------------------------------------------------------------------
const statusCodeMap: Record<number, "pending" | "sent" | "delivered" | "read"> =
  {
    1: "pending",
    2: "sent",
    3: "delivered",
    4: "read",
  };

// ---------------------------------------------------------------------------
// Extract text/media info from an Evolution message object
// ---------------------------------------------------------------------------
function extractMessageContent(msg: Record<string, unknown>): {
  type: "text" | "image" | "audio" | "video" | "document" | "location" | "sticker";
  content: string | null;
  mediaUrl: string | null;
  mediaCaption: string | null;
  mediaMimeType: string | null;
  latitude: string | null;
  longitude: string | null;
} {
  if (msg["conversation"]) {
    return {
      type: "text",
      content: String(msg["conversation"]),
      mediaUrl: null,
      mediaCaption: null,
      mediaMimeType: null,
      latitude: null,
      longitude: null,
    };
  }
  if (msg["extendedTextMessage"]) {
    const ext = msg["extendedTextMessage"] as Record<string, unknown>;
    return {
      type: "text",
      content: String(ext["text"] ?? ""),
      mediaUrl: null,
      mediaCaption: null,
      mediaMimeType: null,
      latitude: null,
      longitude: null,
    };
  }
  if (msg["imageMessage"]) {
    const im = msg["imageMessage"] as Record<string, unknown>;
    return {
      type: "image",
      content: null,
      mediaUrl: String(im["url"] ?? ""),
      mediaCaption: im["caption"] ? String(im["caption"]) : null,
      mediaMimeType: im["mimetype"] ? String(im["mimetype"]) : null,
      latitude: null,
      longitude: null,
    };
  }
  if (msg["audioMessage"]) {
    const am = msg["audioMessage"] as Record<string, unknown>;
    return {
      type: "audio",
      content: null,
      mediaUrl: String(am["url"] ?? ""),
      mediaCaption: null,
      mediaMimeType: am["mimetype"] ? String(am["mimetype"]) : null,
      latitude: null,
      longitude: null,
    };
  }
  if (msg["videoMessage"]) {
    const vm = msg["videoMessage"] as Record<string, unknown>;
    return {
      type: "video",
      content: null,
      mediaUrl: String(vm["url"] ?? ""),
      mediaCaption: vm["caption"] ? String(vm["caption"]) : null,
      mediaMimeType: vm["mimetype"] ? String(vm["mimetype"]) : null,
      latitude: null,
      longitude: null,
    };
  }
  if (msg["documentMessage"]) {
    const dm = msg["documentMessage"] as Record<string, unknown>;
    return {
      type: "document",
      content: dm["title"] ? String(dm["title"]) : null,
      mediaUrl: String(dm["url"] ?? ""),
      mediaCaption: null,
      mediaMimeType: dm["mimetype"] ? String(dm["mimetype"]) : null,
      latitude: null,
      longitude: null,
    };
  }
  if (msg["locationMessage"]) {
    const lm = msg["locationMessage"] as Record<string, unknown>;
    return {
      type: "location",
      content: lm["name"] ? String(lm["name"]) : null,
      mediaUrl: null,
      mediaCaption: null,
      mediaMimeType: null,
      latitude: String(lm["degreesLatitude"] ?? ""),
      longitude: String(lm["degreesLongitude"] ?? ""),
    };
  }
  if (msg["stickerMessage"]) {
    const sm = msg["stickerMessage"] as Record<string, unknown>;
    return {
      type: "sticker",
      content: null,
      mediaUrl: String(sm["url"] ?? ""),
      mediaCaption: null,
      mediaMimeType: sm["mimetype"] ? String(sm["mimetype"]) : null,
      latitude: null,
      longitude: null,
    };
  }
  return {
    type: "text",
    content: null,
    mediaUrl: null,
    mediaCaption: null,
    mediaMimeType: null,
    latitude: null,
    longitude: null,
  };
}

// ---------------------------------------------------------------------------
// Main webhook handler
// ---------------------------------------------------------------------------
router.post(
  "/webhooks/evolution/:instanceName",
  async (req, res): Promise<void> => {
    const instanceName = String(req.params["instanceName"]);
    const payload = req.body as EvolutionWebhookPayload;

    // Look up the instance
    const [instance] = await db
      .select()
      .from(whatsappInstancesTable)
      .where(eq(whatsappInstancesTable.instanceName, instanceName))
      .limit(1);

    if (!instance) {
      res.status(404).json({ error: "Instance not found" });
      return;
    }

    // Validate webhook secret if configured
    if (instance.webhookSecret) {
      const provided = req.headers["x-webhook-secret"];
      if (provided !== instance.webhookSecret) {
        res.status(401).json({ error: "Invalid webhook secret" });
        return;
      }
    }

    const tenantId = instance.tenantId;
    const event = payload.event ?? "";
    const data = payload.data ?? {};

    try {
      if (event === "qrcode.updated") {
        const qr = data["qrcode"] as Record<string, unknown> | undefined;
        await db
          .update(whatsappInstancesTable)
          .set({
            qrCode: String(qr?.["base64"] ?? qr?.["code"] ?? ""),
            qrExpiresAt: new Date(Date.now() + 60_000),
            status: "connecting",
            updatedAt: new Date(),
          })
          .where(eq(whatsappInstancesTable.id, instance.id));

        emitToTenant(tenantId, "whatsapp_qr_updated", {
          tenantId,
          qrCode: qr?.["base64"] ?? qr?.["code"],
        });
      } else if (event === "connection.update") {
        const state = String(data["state"] ?? "");
        const mapped =
          state === "open"
            ? "connected"
            : state === "connecting"
              ? "connecting"
              : "disconnected";
        await db
          .update(whatsappInstancesTable)
          .set({
            status: mapped,
            lastConnectedAt: state === "open" ? new Date() : undefined,
            qrCode: state === "open" ? null : undefined,
            updatedAt: new Date(),
          })
          .where(eq(whatsappInstancesTable.id, instance.id));

        emitToTenant(tenantId, "whatsapp_status_changed", {
          tenantId,
          status: mapped,
        });
      } else if (event === "messages.upsert") {
        const msgData = data as unknown as MessageData;
        const key = msgData.key;
        if (!key || key.fromMe) {
          // Ignora eco das mensagens que nos mesmos enviamos
          res.status(200).json({ ok: true });
          return;
        }

        const phone = jidToPhone(key.remoteJid);

        await handleInboundMessage({
          tenantId,
          channel: "whatsapp",
          externalId: phone,
          phone,
          displayName: msgData.pushName ?? null,
          messageId: key.id,
          timestamp: msgData.messageTimestamp
            ? new Date(msgData.messageTimestamp * 1000)
            : new Date(),
          toIdentifier: instance.phoneNumber ?? "",
          attributeQrMarker: true,
          ...extractMessageContent(msgData.message ?? {}),
        });
      } else if (event === "messages.update") {
        const updates = data as unknown as MessageUpdateItem[];
        for (const update of Array.isArray(updates) ? updates : []) {
          const statusCode = update.update?.status;
          const mapped = statusCode ? statusCodeMap[statusCode] : undefined;
          if (mapped && update.key.id) {
            await db
              .update(messagesTable)
              .set({ status: mapped })
              .where(
                and(
                  eq(messagesTable.tenantId, tenantId),
                  eq(messagesTable.messageId, update.key.id),
                ),
              );
          }
        }
      }
    } catch (err) {
      req.log.error({ err }, "Webhook processing error");
    }

    res.status(200).json({ ok: true });
  },
);

export default router;

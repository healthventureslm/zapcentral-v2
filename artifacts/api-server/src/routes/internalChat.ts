/**
 * Internal 1:1 chat between agents of the same tenant (ramal-to-ramal).
 * Messages live inside the platform only — they never touch WhatsApp.
 */
import { Router } from "express";
import { getAuth } from "../lib/devAuth";
import { db } from "@workspace/db";
import {
  internalConversationsTable,
  internalMessagesTable,
  tenantUsersTable,
} from "@workspace/db";
import { eq, and, or, desc, asc, gt, sql } from "drizzle-orm";
import { z } from "zod";
import {
  requireAuth,
  requireTenantMember,
  isAccessExpired,
} from "../middlewares/auth";
import { emitToTenantAgent } from "../services/socket";

const router = Router();

const startSchema = z.object({ peerId: z.string().min(1) });
const sendSchema = z.object({ content: z.string().min(1).max(4000) });

/** Normalized pair ordering so each duo has exactly one conversation row. */
function orderPair(u1: string, u2: string): { userA: string; userB: string } {
  return u1 < u2 ? { userA: u1, userB: u2 } : { userA: u2, userB: u1 };
}

function peerOf(
  conv: { userA: string; userB: string },
  me: string,
): string {
  return conv.userA === me ? conv.userB : conv.userA;
}

/**
 * Internal chat requires a real, active, unexpired membership — super-admin
 * bypass and "invited" members are not enough for a private 1:1 channel.
 */
async function getActiveMembership(tenantId: number, userId: string) {
  const [m] = await db
    .select({
      clerkUserId: tenantUsersTable.clerkUserId,
      accessExpiresAt: tenantUsersTable.accessExpiresAt,
    })
    .from(tenantUsersTable)
    .where(
      and(
        eq(tenantUsersTable.tenantId, tenantId),
        eq(tenantUsersTable.clerkUserId, userId),
        eq(tenantUsersTable.status, "active"),
      ),
    )
    .limit(1);
  if (!m || isAccessExpired(m)) return null;
  return m;
}

async function getConversationForUser(
  conversationId: number,
  tenantId: number,
  userId: string,
) {
  const [conv] = await db
    .select()
    .from(internalConversationsTable)
    .where(
      and(
        eq(internalConversationsTable.id, conversationId),
        eq(internalConversationsTable.tenantId, tenantId),
        or(
          eq(internalConversationsTable.userA, userId),
          eq(internalConversationsTable.userB, userId),
        ),
      ),
    )
    .limit(1);
  return conv;
}

/**
 * GET /api/tenants/:tenantId/internal/conversations
 * My internal conversations with peer info, last message and unread count.
 */
router.get(
  "/tenants/:tenantId/internal/conversations",
  requireAuth,
  requireTenantMember,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);
    const { userId } = getAuth(req);
    const uid = userId!;

    if (!(await getActiveMembership(tenantId, uid))) {
      res.status(403).json({ error: "Acesso restrito a membros ativos" });
      return;
    }

    const convs = await db
      .select()
      .from(internalConversationsTable)
      .where(
        and(
          eq(internalConversationsTable.tenantId, tenantId),
          or(
            eq(internalConversationsTable.userA, uid),
            eq(internalConversationsTable.userB, uid),
          ),
        ),
      )
      .orderBy(desc(internalConversationsTable.lastMessageAt));

    const enriched = await Promise.all(
      convs.map(async (c) => {
        const peerId = peerOf(c, uid);
        const myLastRead = c.userA === uid ? c.lastReadA : c.lastReadB;

        const [peer] = await db
          .select({
            clerkUserId: tenantUsersTable.clerkUserId,
            email: tenantUsersTable.email,
            firstName: tenantUsersTable.firstName,
            lastName: tenantUsersTable.lastName,
            avatarUrl: tenantUsersTable.avatarUrl,
          })
          .from(tenantUsersTable)
          .where(
            and(
              eq(tenantUsersTable.tenantId, tenantId),
              eq(tenantUsersTable.clerkUserId, peerId),
            ),
          )
          .limit(1);

        const [last] = await db
          .select({
            content: internalMessagesTable.content,
            senderId: internalMessagesTable.senderId,
            createdAt: internalMessagesTable.createdAt,
          })
          .from(internalMessagesTable)
          .where(eq(internalMessagesTable.conversationId, c.id))
          .orderBy(desc(internalMessagesTable.createdAt))
          .limit(1);

        const unreadConds = [
          eq(internalMessagesTable.conversationId, c.id),
          sql`${internalMessagesTable.senderId} <> ${uid}`,
        ];
        if (myLastRead) {
          unreadConds.push(gt(internalMessagesTable.createdAt, myLastRead));
        }
        const [unread] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(internalMessagesTable)
          .where(and(...unreadConds));

        return {
          id: c.id,
          peer: peer ?? {
            clerkUserId: peerId,
            email: "",
            firstName: null,
            lastName: null,
            avatarUrl: null,
          },
          lastMessage: last ?? null,
          unreadCount: unread?.count ?? 0,
          lastMessageAt: c.lastMessageAt,
        };
      }),
    );

    res.json(enriched);
  },
);

/**
 * POST /api/tenants/:tenantId/internal/conversations
 * Get-or-create the 1:1 conversation with a colleague.
 */
router.post(
  "/tenants/:tenantId/internal/conversations",
  requireAuth,
  requireTenantMember,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);
    const { userId } = getAuth(req);
    const uid = userId!;

    if (!(await getActiveMembership(tenantId, uid))) {
      res.status(403).json({ error: "Acesso restrito a membros ativos" });
      return;
    }

    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.format() });
      return;
    }
    const peerId = parsed.data.peerId;

    if (peerId === uid) {
      res.status(400).json({ error: "Não é possível conversar consigo mesmo" });
      return;
    }

    // Peer must be an active, unexpired member of this tenant
    const peer = await getActiveMembership(tenantId, peerId);
    if (!peer) {
      res
        .status(404)
        .json({ error: "Colega não encontrado ou inativo nesta central" });
      return;
    }

    const { userA, userB } = orderPair(uid, peerId);

    const [conv] = await db
      .insert(internalConversationsTable)
      .values({ tenantId, userA, userB })
      .onConflictDoNothing({
        target: [
          internalConversationsTable.tenantId,
          internalConversationsTable.userA,
          internalConversationsTable.userB,
        ],
      })
      .returning();

    if (conv) {
      res.status(201).json({ id: conv.id });
      return;
    }

    const [existing] = await db
      .select({ id: internalConversationsTable.id })
      .from(internalConversationsTable)
      .where(
        and(
          eq(internalConversationsTable.tenantId, tenantId),
          eq(internalConversationsTable.userA, userA),
          eq(internalConversationsTable.userB, userB),
        ),
      )
      .limit(1);

    res.json({ id: existing!.id });
  },
);

/**
 * GET /api/tenants/:tenantId/internal/conversations/:conversationId/messages
 * Lists messages (ascending) and marks the conversation read for the caller.
 */
router.get(
  "/tenants/:tenantId/internal/conversations/:conversationId/messages",
  requireAuth,
  requireTenantMember,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);
    const conversationId = Number(req.params["conversationId"]);
    const { userId } = getAuth(req);
    const uid = userId!;

    if (!(await getActiveMembership(tenantId, uid))) {
      res.status(403).json({ error: "Acesso restrito a membros ativos" });
      return;
    }

    const conv = await getConversationForUser(conversationId, tenantId, uid);
    if (!conv) {
      res.status(404).json({ error: "Conversa não encontrada" });
      return;
    }

    const messages = await db
      .select()
      .from(internalMessagesTable)
      .where(eq(internalMessagesTable.conversationId, conversationId))
      .orderBy(asc(internalMessagesTable.createdAt))
      .limit(500);

    // Mark read up to the newest message the caller actually received —
    // never wall-clock "now", which would swallow messages inserted
    // between the SELECT above and this UPDATE. Monotonic via GREATEST.
    const newest = messages[messages.length - 1]?.createdAt;
    if (newest) {
      const readCol =
        conv.userA === uid
          ? internalConversationsTable.lastReadA
          : internalConversationsTable.lastReadB;
      await db
        .update(internalConversationsTable)
        .set({
          [conv.userA === uid ? "lastReadA" : "lastReadB"]: sql`GREATEST(COALESCE(${readCol}, 'epoch'::timestamptz), ${newest.toISOString()}::timestamptz)`,
        })
        .where(eq(internalConversationsTable.id, conversationId));
    }

    res.json(messages);
  },
);

/**
 * POST /api/tenants/:tenantId/internal/conversations/:conversationId/messages
 */
router.post(
  "/tenants/:tenantId/internal/conversations/:conversationId/messages",
  requireAuth,
  requireTenantMember,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);
    const conversationId = Number(req.params["conversationId"]);
    const { userId } = getAuth(req);
    const uid = userId!;

    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.format() });
      return;
    }

    if (!(await getActiveMembership(tenantId, uid))) {
      res.status(403).json({ error: "Acesso restrito a membros ativos" });
      return;
    }

    const conv = await getConversationForUser(conversationId, tenantId, uid);
    if (!conv) {
      res.status(404).json({ error: "Conversa não encontrada" });
      return;
    }

    const peerId = peerOf(conv, uid);

    // Peer must still be an active, unexpired member — revoked colleagues
    // must stop receiving internal messages immediately.
    if (!(await getActiveMembership(tenantId, peerId))) {
      res
        .status(409)
        .json({ error: "Este colega não está mais ativo nesta central" });
      return;
    }

    const [msg] = await db
      .insert(internalMessagesTable)
      .values({
        conversationId,
        tenantId,
        senderId: uid,
        content: parsed.data.content,
      })
      .returning();

    // Bump lastMessageAt and the sender's read marker monotonically,
    // anchored to the message's DB timestamp (not app wall-clock).
    const msgTs = msg!.createdAt.toISOString();
    const senderReadCol =
      conv.userA === uid
        ? internalConversationsTable.lastReadA
        : internalConversationsTable.lastReadB;
    await db
      .update(internalConversationsTable)
      .set({
        lastMessageAt: sql`GREATEST(COALESCE(${internalConversationsTable.lastMessageAt}, 'epoch'::timestamptz), ${msgTs}::timestamptz)`,
        [conv.userA === uid ? "lastReadA" : "lastReadB"]: sql`GREATEST(COALESCE(${senderReadCol}, 'epoch'::timestamptz), ${msgTs}::timestamptz)`,
      })
      .where(eq(internalConversationsTable.id, conversationId));

    // Sender name for the notification
    const [sender] = await db
      .select({
        firstName: tenantUsersTable.firstName,
        lastName: tenantUsersTable.lastName,
        email: tenantUsersTable.email,
      })
      .from(tenantUsersTable)
      .where(
        and(
          eq(tenantUsersTable.tenantId, tenantId),
          eq(tenantUsersTable.clerkUserId, uid),
        ),
      )
      .limit(1);

    emitToTenantAgent(tenantId, peerId, "internal_message", {
      conversationId,
      tenantId,
      message: msg,
      senderName: sender?.firstName
        ? `${sender.firstName} ${sender.lastName ?? ""}`.trim()
        : (sender?.email ?? "Colega"),
    });

    res.status(201).json(msg);
  },
);

export default router;

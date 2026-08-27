/**
 * Socket.io singleton — initialized once in index.ts.
 *
 * Security model:
 *   - Every connection is authenticated via Clerk session token (cookie or
 *     explicit `auth.token`). Unauthenticated connections are rejected.
 *   - `join_tenant` verifies the caller is an active member (or super admin)
 *     of the requested tenant via a DB lookup.
 *   - `join_agent` joins the per-agent room using the server-verified userId,
 *     never a client-supplied string.
 *
 * Room naming:
 *   tenant:{tenantId}   — all verified agents/supervisors in a tenant
 *   agent:{userId}      — targeted notifications for a specific agent
 */
import { type Server as HttpServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { verifyToken } from "../lib/devAuth";
import { distribuirFilaParada } from "./ivr";
import { logger } from "../lib/logger";
import { db } from "@workspace/db";
import { tenantUsersTable, agentStatusesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

let _io: SocketIOServer | null = null;

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function parseCookieValue(header: string, name: string): string | null {
  const match = header.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]!) : null;
}

async function verifyClerkToken(token: string): Promise<string | null> {
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env["CLERK_SECRET_KEY"],
    });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function initSocket(httpServer: HttpServer): SocketIOServer {
  const trustedOrigins: string[] = [];

  (process.env["ALLOWED_ORIGINS"] ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
    .forEach((o) => trustedOrigins.push(o));

  if (
    process.env["NODE_ENV"] !== "production" &&
    process.env["REPLIT_DEV_DOMAIN"]
  ) {
    trustedOrigins.push(`https://${process.env["REPLIT_DEV_DOMAIN"]}`);
  }

  _io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin:
        trustedOrigins.length > 0
          ? trustedOrigins
          : process.env["NODE_ENV"] !== "production"
            ? true
            : false,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // ---------------------------------------------------------------------------
  // Auth middleware — verify Clerk session before accepting the connection
  // ---------------------------------------------------------------------------
  _io.use(async (socket, next) => {
    // 1. Explicit token from socket handshake auth (preferred)
    const authToken = socket.handshake.auth?.token as string | undefined;

    // 2. Session cookie (Clerk sets __session or __clerk_db_jwt)
    const cookieHeader = socket.handshake.headers.cookie ?? "";
    const cookieToken =
      parseCookieValue(cookieHeader, "__session") ??
      parseCookieValue(cookieHeader, "__clerk_db_jwt");

    const token = authToken || cookieToken;

    if (!token) {
      return next(new Error("Unauthorized: no session token"));
    }

    const userId = await verifyClerkToken(token);
    if (!userId) {
      return next(new Error("Unauthorized: invalid or expired token"));
    }

    socket.data["userId"] = userId;
    next();
  });

  _io.on("connection", (socket) => handleConnection(socket));

  return _io;
}

// ---------------------------------------------------------------------------
// Connection handler
// ---------------------------------------------------------------------------

/**
 * Presenca: quem esta com o painel aberto esta disponivel para a fila.
 *
 * Antes disto, `agent_statuses.status` so mudava se o agente clicasse no
 * seletor, e o padrao da coluna e 'offline'. Como o `tryAutoAssign` so
 * considera quem esta 'available', a fila nunca distribuia nada: as conversas
 * ficavam empilhadas em 'waiting'.
 *
 * `away` e `busy` sao escolhas deliberadas do agente e nao sao sobrescritas —
 * so quem esta 'offline' passa a 'available' ao conectar.
 */
async function marcarPresenca(
  tenantId: number,
  clerkUserId: string,
  online: boolean,
): Promise<void> {
  let row:
    | { status: (typeof agentStatusesTable.status.enumValues)[number] }
    | undefined;

  if (online) {
    // Upsert, nao update: a maioria dos agentes de uma base existente ainda nao
    // tem linha em `agent_statuses` — ela so nascia quando alguem trocava o
    // proprio status na mao. Um UPDATE puro nao consertaria ninguem que ja
    // estava cadastrado antes desta mudanca.
    [row] = await db
      .insert(agentStatusesTable)
      .values({ tenantId, clerkUserId, status: "available" })
      .onConflictDoUpdate({
        target: [agentStatusesTable.clerkUserId, agentStatusesTable.tenantId],
        set: { status: "available", updatedAt: new Date() },
        // `away` e `busy` sao escolha explicita do agente no seletor do painel:
        // abrir uma aba nova nao pode desfazer isso.
        setWhere: eq(agentStatusesTable.status, "offline"),
      })
      .returning({ status: agentStatusesTable.status });
  } else {
    [row] = await db
      .update(agentStatusesTable)
      .set({ status: "offline", updatedAt: new Date() })
      .where(
        and(
          eq(agentStatusesTable.tenantId, tenantId),
          eq(agentStatusesTable.clerkUserId, clerkUserId),
          eq(agentStatusesTable.status, "available"),
        ),
      )
      .returning({ status: agentStatusesTable.status });
  }

  if (!row) return;

  emitToTenant(tenantId, "agent_status_updated", {
    clerkUserId,
    status: row.status,
  });

  // Ficar disponivel precisa puxar o que ja esta parado na fila. Sem isto, a
  // conversa que chegou enquanto ninguem estava conectado fica em 'waiting'
  // para sempre: o `tryAutoAssign` so roda quando chega mensagem nova, e uma
  // conversa ja roteada nao passa mais pelo IVR.
  if (online) {
    for (const { agente, conversa } of await distribuirFilaParada(
      tenantId,
      clerkUserId,
    )) {
      emitToTenant(tenantId, "conversation_updated", { conversation: conversa });
      emitToAgent(agente, "conversation_assigned", { conversation: conversa });
    }
  }
}

/**
 * Roda o efeito e engole a falha com log.
 *
 * Handlers de socket sao async e nao tem quem os aguarde: uma rejeicao aqui
 * viraria unhandled rejection, e o Node >= 15 derruba o processo por padrao.
 * Perder a marcacao de presenca de um agente e ruim; derrubar a API inteira
 * junto com os webhooks e as conexoes de todo mundo e muito pior.
 */
async function comLog(
  acao: string,
  efeito: () => Promise<unknown>,
): Promise<void> {
  try {
    await efeito();
  } catch (err) {
    logger.error({ err, acao }, "Falha ao atualizar presenca do agente");
  }
}

/**
 * Ninguem esta conectado quando o processo sobe. Sem esta limpeza, um reinicio
 * deixaria como 'available' todos os agentes que estavam online antes da queda,
 * e a fila distribuiria conversas para gente que ja foi embora.
 */
export async function reconciliarPresenca(): Promise<void> {
  try {
    await db
      .update(agentStatusesTable)
      .set({ status: "offline", updatedAt: new Date() })
      .where(eq(agentStatusesTable.status, "available"));
  } catch (err) {
    logger.error({ err }, "Falha ao reconciliar presenca no boot");
  }
}

/** Quantas outras conexoes deste agente seguem abertas nesta central. */
async function outrasConexoes(
  tenantId: number,
  userId: string,
): Promise<number> {
  try {
    const sockets = await getIo()
      .in(`tenant:${tenantId}:agent:${userId}`)
      .fetchSockets();
    return sockets.length;
  } catch {
    return 0;
  }
}

function handleConnection(socket: Socket): void {
  const userId = socket.data["userId"] as string;
  // Centrais em que este socket entrou — usado no disconnect, quando os rooms
  // do socket ja nao podem mais ser consultados.
  const centrais = new Set<number>();

  // Automatically join the per-agent room using server-verified userId
  void socket.join(`agent:${userId}`);

  socket.on("join_tenant", async (tenantId: unknown) => {
    if (typeof tenantId !== "number" || !Number.isInteger(tenantId) || tenantId <= 0) {
      return;
    }

    // Verify the authenticated user is an active member (or super admin) of this tenant
    const [tenantMember] = await db
      .select({
        isSuperAdmin: tenantUsersTable.isSuperAdmin,
        status: tenantUsersTable.status,
        tenantId: tenantUsersTable.tenantId,
        accessExpiresAt: tenantUsersTable.accessExpiresAt,
      })
      .from(tenantUsersTable)
      .where(
        and(
          eq(tenantUsersTable.clerkUserId, userId),
          eq(tenantUsersTable.tenantId, tenantId),
        ),
      )
      .limit(1);

    const isSuperAdmin = tenantMember?.isSuperAdmin === true;
    const notExpired =
      !tenantMember?.accessExpiresAt ||
      tenantMember.accessExpiresAt.getTime() > Date.now();
    const isActiveMember =
      tenantMember && tenantMember.status === "active" && notExpired;

    if (!isActiveMember && !isSuperAdmin) {
      // Silently ignore unauthorized join attempts
      return;
    }

    void socket.join(`tenant:${tenantId}`);
    // Tenant-scoped per-agent room: only joined after membership verification,
    // so tenant-private payloads (e.g. internal chat) never leak to sockets
    // authenticated as the same user but authorized in a different tenant.
    void socket.join(`tenant:${tenantId}:agent:${userId}`);

    centrais.add(tenantId);
    await comLog("presenca ao entrar", () =>
      marcarPresenca(tenantId, userId, true),
    );
  });

  socket.on("leave_tenant", async (tenantId: unknown) => {
    if (typeof tenantId === "number" && tenantId > 0) {
      void socket.leave(`tenant:${tenantId}`);
      void socket.leave(`tenant:${tenantId}:agent:${userId}`);
      centrais.delete(tenantId);

      if ((await outrasConexoes(tenantId, userId)) === 0) {
        await comLog("presenca ao sair", () =>
          marcarPresenca(tenantId, userId, false),
        );
      }
    }
  });

  // Fechar o painel tira o agente da fila. Uma segunda aba ainda aberta o
  // mantem disponivel — por isso a contagem de conexoes restantes.
  socket.on("disconnect", () => {
    void comLog("presenca ao desconectar", async () => {
      for (const tenantId of centrais) {
        if ((await outrasConexoes(tenantId, userId)) === 0) {
          await marcarPresenca(tenantId, userId, false);
        }
      }
    });
  });

  // join_agent is kept for API compatibility but now uses the server-verified userId
  // The value from the client is intentionally ignored
  socket.on("join_agent", () => {
    // Already joined agent room on connection — this is a no-op but kept for
    // backwards compatibility so the client doesn't need to change
  });
}

// ---------------------------------------------------------------------------
// Typed emit helpers
// ---------------------------------------------------------------------------

export function getIo(): SocketIOServer {
  if (!_io) {
    throw new Error("Socket.io not initialized. Call initSocket() first.");
  }
  return _io;
}

export function emitToTenant(
  tenantId: number,
  event: string,
  data: unknown,
): void {
  try {
    getIo().to(`tenant:${tenantId}`).emit(event, data);
  } catch {
    // Socket may not be initialized in test environments
  }
}

export function emitToAgent(
  clerkUserId: string,
  event: string,
  data: unknown,
): void {
  try {
    getIo().to(`agent:${clerkUserId}`).emit(event, data);
  } catch {
    // Socket may not be initialized
  }
}

/**
 * Emit to an agent only on sockets that passed membership verification for
 * this tenant (see join_tenant). Use for tenant-private payloads.
 */
export function emitToTenantAgent(
  tenantId: number,
  clerkUserId: string,
  event: string,
  data: unknown,
): void {
  try {
    getIo().to(`tenant:${tenantId}:agent:${clerkUserId}`).emit(event, data);
  } catch {
    // Socket may not be initialized
  }
}

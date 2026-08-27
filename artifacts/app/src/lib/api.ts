/**
 * Typed fetch helpers for the new API endpoints.
 * A base e o modo de autenticacao vem de ./apiBase — veja la a diferenca
 * entre mesma origem e origem separada (frontend no Vercel).
 */
import { API_BASE, authHeaders } from "./apiBase";

export { API_BASE };

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
      ...(options.headers as Record<string, string>),
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(body.error ?? res.statusText), {
      status: res.status,
      body,
    });
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type ConversationStatus =
  | "new"
  | "ivr"
  | "waiting"
  | "active"
  | "closed";

export type ChannelType = "whatsapp" | "telegram";

export interface Contact {
  id: number;
  channel?: ChannelType;
  externalId?: string;
  /** Nulo em contatos de Telegram, que nao expoem telefone. */
  phone: string | null;
  name: string | null;
  cpf?: string | null;
  email: string | null;
  avatarUrl: string | null;
}

/**
 * Identificador exibivel do contato: telefone no WhatsApp, chat_id no
 * Telegram. Usar sempre que a UI precisar de um rotulo de fallback.
 */
export function contactHandle(c: {
  phone: string | null;
  externalId?: string;
}): string {
  return c.phone ?? c.externalId ?? "";
}

export interface Conversation {
  id: number;
  tenantId: number;
  contactId: number;
  status: ConversationStatus;
  departmentId: number | null;
  departmentName: string | null;
  departmentColor: string | null;
  assignedTo: string | null;
  lastMessageAt: string | null;
  updatedAt: string;
  createdAt: string;
  contact: Contact;
}

export interface Message {
  id: number;
  conversationId: number;
  tenantId: number;
  messageId: string | null;
  fromPhone: string;
  toPhone: string;
  type: "text" | "image" | "audio" | "video" | "document" | "location" | "sticker";
  content: string | null;
  mediaUrl: string | null;
  mediaCaption: string | null;
  direction: "inbound" | "outbound";
  status: string;
  timestamp: string;
  sentBy: string | null;
}

export interface AgentStatus {
  clerkUserId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: "available" | "busy" | "away" | "offline";
  maxConversations: number;
  activeConversations: number;
}

export interface WhatsAppStatus {
  instance: {
    id: number;
    instanceName: string;
    phoneNumber: string | null;
    status: "connecting" | "connected" | "disconnected" | "error";
    lastConnectedAt: string | null;
  } | null;
  evolutionConfigured: boolean;
}

export interface ChannelSettings {
  id: number;
  tenantId: number;
  welcomeMessage: string;
  menuPrompt: string;
  menuOptions: { key: string; label: string; departmentId: number }[];
  offHoursMessage: string;
  closingMessage: string;
  inactivityTimeoutMinutes: number;
  autoCloseEnabled: boolean;
  distributionMode: "manual" | "round_robin" | "least_load";
  workingHoursEnabled: boolean;
  workingHours: Record<
    string,
    { start: string; end: string; active: boolean }
  > | null;
}

export interface QuickReply {
  id: number;
  tenantId: number;
  shortcut: string;
  content: string;
}

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------
export const getWhatsAppStatus = (tenantId: number) =>
  apiFetch<WhatsAppStatus>(`/tenants/${tenantId}/whatsapp/status`);

export const connectWhatsApp = (tenantId: number) =>
  apiFetch<{ status: string; qrCode?: string }>(`/tenants/${tenantId}/whatsapp/connect`, {
    method: "POST",
  });

export const getWhatsAppQr = (tenantId: number) =>
  apiFetch<{ status: string; qrCode?: string; phoneNumber?: string; qrExpiresAt?: string }>(
    `/tenants/${tenantId}/whatsapp/qr`,
  );

export const disconnectWhatsApp = (tenantId: number) =>
  apiFetch<void>(`/tenants/${tenantId}/whatsapp/disconnect`, {
    method: "DELETE",
  });

// ---------------------------------------------------------------------------
// Telegram
// ---------------------------------------------------------------------------
export interface TelegramBot {
  id: number;
  botId: string | null;
  botUsername: string | null;
  botFirstName: string | null;
  status: "connected" | "disconnected" | "error";
  webhookUrl: string | null;
  lastError: string | null;
  lastConnectedAt: string | null;
}

export interface TelegramStatus {
  connected: boolean;
  bot: TelegramBot | null;
  remoteUrl?: string | null;
  pendingUpdates?: number | null;
  /** true quando o webhook registrado no Telegram nao aponta mais para nos */
  webhookStale?: boolean;
  /** false quando a URL pública deste servidor não é alcançável pelo Telegram */
  webhookAlcancavel?: boolean;
  /** Por que não é alcançável, em português, para mostrar na tela */
  webhookMotivo?: string | null;
  /** A URL pública que o servidor usaria para o webhook */
  urlPublica?: string;
}

export const getTelegramStatus = (tenantId: number) =>
  apiFetch<TelegramStatus>(`/tenants/${tenantId}/telegram/status`);

export const connectTelegram = (tenantId: number, botToken: string) =>
  apiFetch<{ connected: boolean; bot: TelegramBot }>(
    `/tenants/${tenantId}/telegram/connect`,
    { method: "POST", body: JSON.stringify({ botToken }) },
  );

/** Re-registra o webhook na URL publica atual (necessario quando o tunel muda). */
export const refreshTelegramWebhook = (tenantId: number) =>
  apiFetch<{ connected: boolean; bot: TelegramBot }>(
    `/tenants/${tenantId}/telegram/refresh-webhook`,
    { method: "POST" },
  );

export const disconnectTelegram = (tenantId: number) =>
  apiFetch<void>(`/tenants/${tenantId}/telegram/disconnect`, {
    method: "DELETE",
  });

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------
export const listConversations = (
  tenantId: number,
  params: { status?: string; departmentId?: number; limit?: number; offset?: number } = {},
) => {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.departmentId) qs.set("departmentId", String(params.departmentId));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  return apiFetch<{ conversations: Conversation[]; total: number }>(
    `/tenants/${tenantId}/conversations?${qs}`,
  );
};

export const getConversation = (tenantId: number, conversationId: number) =>
  apiFetch<Conversation>(`/tenants/${tenantId}/conversations/${conversationId}`);

export const pickConversation = (tenantId: number, conversationId: number) =>
  apiFetch<Conversation>(`/tenants/${tenantId}/conversations/${conversationId}/pick`, {
    method: "POST",
  });

export const transferConversation = (
  tenantId: number,
  conversationId: number,
  body: { toDepartmentId?: number; toAgentId?: string; note?: string },
) =>
  apiFetch<Conversation>(`/tenants/${tenantId}/conversations/${conversationId}/transfer`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const closeConversation = (
  tenantId: number,
  conversationId: number,
  note?: string,
) =>
  apiFetch<Conversation>(`/tenants/${tenantId}/conversations/${conversationId}/close`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
export const listMessages = (tenantId: number, conversationId: number) =>
  apiFetch<Message[]>(`/tenants/${tenantId}/conversations/${conversationId}/messages`);

export const sendMessage = (
  tenantId: number,
  conversationId: number,
  body: { type: "text"; content: string } | { type: "image" | "video" | "document" | "audio"; mediaUrl: string; mediaCaption?: string },
) =>
  apiFetch<Message>(
    `/tenants/${tenantId}/conversations/${conversationId}/messages`,
    { method: "POST", body: JSON.stringify(body) },
  );

// ---------------------------------------------------------------------------
// Agent status
// ---------------------------------------------------------------------------
export const listAgentStatuses = (tenantId: number) =>
  apiFetch<AgentStatus[]>(`/tenants/${tenantId}/agents/status`);

export const getMyStatus = (tenantId: number) =>
  apiFetch<AgentStatus>(`/tenants/${tenantId}/agents/me/status`);

export const updateMyStatus = (
  tenantId: number,
  body: { status: "available" | "busy" | "away" | "offline"; maxConversations?: number },
) =>
  apiFetch<AgentStatus>(`/tenants/${tenantId}/agents/me/status`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

// ---------------------------------------------------------------------------
// Channel settings
// ---------------------------------------------------------------------------
export const getChannelSettings = (tenantId: number) =>
  apiFetch<ChannelSettings>(`/tenants/${tenantId}/channel-settings`);

export const updateChannelSettings = (
  tenantId: number,
  body: Partial<ChannelSettings>,
) =>
  apiFetch<ChannelSettings>(`/tenants/${tenantId}/channel-settings`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

// ---------------------------------------------------------------------------
// Quick replies
// ---------------------------------------------------------------------------
export const listQuickReplies = (tenantId: number) =>
  apiFetch<QuickReply[]>(`/tenants/${tenantId}/quick-replies`);

export const createQuickReply = (
  tenantId: number,
  body: { shortcut: string; content: string },
) =>
  apiFetch<QuickReply>(`/tenants/${tenantId}/quick-replies`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const deleteQuickReply = (tenantId: number, replyId: number) =>
  apiFetch<void>(`/tenants/${tenantId}/quick-replies/${replyId}`, {
    method: "DELETE",
  });

// ---------------------------------------------------------------------------
// CRM — Contacts
// ---------------------------------------------------------------------------
export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface CrmContact {
  id: number;
  tenantId: number;
  phone: string;
  name: string | null;
  email: string | null;
  cpf: string | null;
  origin: "invite" | "qr" | "organic";
  company: string | null;
  avatarUrl: string | null;
  notes: string | null;
  assignedTo: string | null;
  firstContactAt: string;
  lastContactAt: string;
  tags: Tag[];
}

// ---------------------------------------------------------------------------
// Team & department management (admin)
// ---------------------------------------------------------------------------

export interface TenantUserRow {
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: "admin" | "supervisor" | "agent";
  status: "active" | "invited" | "suspended";
  isSuperAdmin: boolean;
  accessExpiresAt: string | null;
  departments: string[];
  joinedAt: string;
}

export const listTenantUsers = (tenantId: number) =>
  apiFetch<TenantUserRow[]>(`/tenants/${tenantId}/users`);

export const inviteTenantUser = (
  tenantId: number,
  body: { email: string; role: TenantUserRow["role"]; accessExpiresAt?: string | null },
) =>
  apiFetch<TenantUserRow>(`/tenants/${tenantId}/users/invite`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const patchTenantUser = (
  tenantId: number,
  userId: string,
  body: Partial<{
    role: TenantUserRow["role"];
    status: "active" | "suspended";
    accessExpiresAt: string | null;
  }>,
) =>
  apiFetch<TenantUserRow>(`/tenants/${tenantId}/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const removeTenantUser = (tenantId: number, userId: string) =>
  apiFetch<void>(`/tenants/${tenantId}/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });

export interface DepartmentRow {
  id: number;
  tenantId: number;
  name: string;
  description: string | null;
  color: string;
  status: "active" | "inactive";
  maxAgents: number | null;
  agentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentAgentRow {
  clerkUserId: string;
  isPrimary: boolean;
  addedAt: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export const listDepartments = (tenantId: number) =>
  apiFetch<DepartmentRow[]>(`/tenants/${tenantId}/departments`);

export const createDepartment = (
  tenantId: number,
  body: { name: string; description?: string | null; color?: string; maxAgents?: number | null },
) =>
  apiFetch<DepartmentRow>(`/tenants/${tenantId}/departments`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateDepartment = (
  tenantId: number,
  departmentId: number,
  body: Partial<{
    name: string;
    description: string | null;
    color: string;
    status: "active" | "inactive";
    maxAgents: number | null;
  }>,
) =>
  apiFetch<DepartmentRow>(`/tenants/${tenantId}/departments/${departmentId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteDepartment = (tenantId: number, departmentId: number) =>
  apiFetch<void>(`/tenants/${tenantId}/departments/${departmentId}`, {
    method: "DELETE",
  });

export const listDepartmentAgents = (tenantId: number, departmentId: number) =>
  apiFetch<DepartmentAgentRow[]>(
    `/tenants/${tenantId}/departments/${departmentId}/agents`,
  );

export const addDepartmentAgent = (
  tenantId: number,
  departmentId: number,
  body: { clerkUserId: string; isPrimary?: boolean },
) =>
  apiFetch<DepartmentAgentRow>(
    `/tenants/${tenantId}/departments/${departmentId}/agents`,
    { method: "POST", body: JSON.stringify(body) },
  );

export const removeDepartmentAgent = (
  tenantId: number,
  departmentId: number,
  userId: string,
) =>
  apiFetch<void>(
    `/tenants/${tenantId}/departments/${departmentId}/agents/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );

// ---------------------------------------------------------------------------
// Internal chat (ramal-to-ramal)
// ---------------------------------------------------------------------------

export interface InternalPeer {
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface InternalConversationRow {
  id: number;
  peer: InternalPeer;
  lastMessage: { content: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
  lastMessageAt: string | null;
}

export interface InternalMessage {
  id: number;
  conversationId: number;
  tenantId: number;
  senderId: string;
  content: string;
  createdAt: string;
}

export const listInternalConversations = (tenantId: number) =>
  apiFetch<InternalConversationRow[]>(`/tenants/${tenantId}/internal/conversations`);

export const startInternalConversation = (tenantId: number, peerId: string) =>
  apiFetch<{ id: number }>(`/tenants/${tenantId}/internal/conversations`, {
    method: "POST",
    body: JSON.stringify({ peerId }),
  });

export const listInternalMessages = (tenantId: number, conversationId: number) =>
  apiFetch<InternalMessage[]>(
    `/tenants/${tenantId}/internal/conversations/${conversationId}/messages`,
  );

export const sendInternalMessage = (
  tenantId: number,
  conversationId: number,
  content: string,
) =>
  apiFetch<InternalMessage>(
    `/tenants/${tenantId}/internal/conversations/${conversationId}/messages`,
    { method: "POST", body: JSON.stringify({ content }) },
  );

export interface PublicWaLink {
  tenantName: string;
  connected: boolean;
  phoneNumber: string | null;
  qrMarker: string;
}

/** Public (unauthenticated) — used by the shareable QR page. */
export const getPublicWaLink = (token: string) =>
  apiFetch<PublicWaLink>(`/public/wa-link/${encodeURIComponent(token)}`);

/** Admin — returns (creating if needed) the tenant's QR share token. */
export const getQrShareToken = (tenantId: number) =>
  apiFetch<{ token: string }>(`/tenants/${tenantId}/whatsapp/qr-share`);

export const rotateQrShareToken = (tenantId: number) =>
  apiFetch<{ token: string }>(`/tenants/${tenantId}/whatsapp/qr-share/rotate`, {
    method: "POST",
  });

export interface CustomField {
  id: number;
  name: string;
  type: "text" | "number" | "date" | "select";
  options: string[] | null;
  position: number;
}

export interface ContactNote {
  id: number;
  contactId: number;
  conversationId: number | null;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface DealStage {
  id: number;
  name: string;
  color: string;
  position: number;
}

export interface Deal {
  id: number;
  contactId: number;
  stageId: number;
  title: string;
  value: string | null;
  status: "open" | "won" | "lost";
  assignedTo: string | null;
  description: string | null;
  expectedCloseAt: string | null;
  closedAt: string | null;
  createdAt: string;
  contactName?: string | null;
  contactPhone?: string;
  stageName?: string;
  stageColor?: string;
}

export interface CrmContactDetail extends Omit<CrmContact, "notes"> {
  conversations: Conversation[];
  deals: Deal[];
  notes: ContactNote[];
  customFields: (CustomField & { value: string | null })[];
}

export const listContacts = (
  tenantId: number,
  params: { q?: string; tagId?: number; assignedTo?: string; page?: number; limit?: number } = {},
) => {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.tagId) qs.set("tagId", String(params.tagId));
  if (params.assignedTo) qs.set("assignedTo", params.assignedTo);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  return apiFetch<{ contacts: CrmContact[]; total: number; page: number; limit: number }>(
    `/tenants/${tenantId}/contacts?${qs}`,
  );
};

export const getContact = (tenantId: number, contactId: number) =>
  apiFetch<CrmContactDetail>(`/tenants/${tenantId}/contacts/${contactId}`);

export const createContact = (
  tenantId: number,
  body: { phone: string; name?: string | null; email?: string | null; cpf?: string | null; origin?: "invite" | "qr" | "organic"; company?: string | null; notes?: string | null },
) =>
  apiFetch<CrmContact>(`/tenants/${tenantId}/contacts`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateContact = (
  tenantId: number,
  contactId: number,
  body: Partial<{ phone: string; name: string | null; email: string | null; cpf: string | null; company: string | null; notes: string | null; assignedTo: string | null }>,
) =>
  apiFetch<CrmContact>(`/tenants/${tenantId}/contacts/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteContact = (tenantId: number, contactId: number) =>
  apiFetch<void>(`/tenants/${tenantId}/contacts/${contactId}`, { method: "DELETE" });

export const mergeContacts = (
  tenantId: number,
  body: { primaryId: number; duplicateId: number },
) =>
  apiFetch<CrmContact>(`/tenants/${tenantId}/contacts/merge`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const importContactsCsv = (tenantId: number, csv: string) =>
  apiFetch<{ imported: number; skipped: number; errors: string[] }>(
    `/tenants/${tenantId}/contacts/import`,
    { method: "POST", body: JSON.stringify({ csv }) },
  );

export const contactsExportUrl = (tenantId: number) =>
  `${API_BASE}/tenants/${tenantId}/contacts/export`;

export const bulkContacts = (
  tenantId: number,
  body: { contactIds: number[]; addTagId?: number; assignedTo?: string | null },
) =>
  apiFetch<{ updated: number }>(`/tenants/${tenantId}/contacts/bulk`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const setContactCustomValues = (
  tenantId: number,
  contactId: number,
  values: { fieldId: number; value: string | null }[],
) =>
  apiFetch<{ ok: boolean }>(`/tenants/${tenantId}/contacts/${contactId}/custom-values`, {
    method: "PUT",
    body: JSON.stringify({ values }),
  });

// Notes
export const listContactNotes = (tenantId: number, contactId: number) =>
  apiFetch<ContactNote[]>(`/tenants/${tenantId}/contacts/${contactId}/notes`);

export const createContactNote = (
  tenantId: number,
  contactId: number,
  body: { content: string; conversationId?: number | null },
) =>
  apiFetch<ContactNote>(`/tenants/${tenantId}/contacts/${contactId}/notes`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const deleteNote = (tenantId: number, noteId: number) =>
  apiFetch<void>(`/tenants/${tenantId}/notes/${noteId}`, { method: "DELETE" });

export const listConversationNotes = (tenantId: number, conversationId: number) =>
  apiFetch<ContactNote[]>(`/tenants/${tenantId}/conversations/${conversationId}/notes`);

// Tags
export const listTags = (tenantId: number) =>
  apiFetch<Tag[]>(`/tenants/${tenantId}/tags`);

export const createTag = (tenantId: number, body: { name: string; color?: string }) =>
  apiFetch<Tag>(`/tenants/${tenantId}/tags`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const deleteTag = (tenantId: number, tagId: number) =>
  apiFetch<void>(`/tenants/${tenantId}/tags/${tagId}`, { method: "DELETE" });

export const addContactTag = (tenantId: number, contactId: number, tagId: number) =>
  apiFetch<{ ok: boolean }>(`/tenants/${tenantId}/contacts/${contactId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tagId }),
  });

export const removeContactTag = (tenantId: number, contactId: number, tagId: number) =>
  apiFetch<void>(`/tenants/${tenantId}/contacts/${contactId}/tags/${tagId}`, {
    method: "DELETE",
  });

export const listConversationTags = (tenantId: number, conversationId: number) =>
  apiFetch<Tag[]>(`/tenants/${tenantId}/conversations/${conversationId}/tags`);

export const addConversationTag = (
  tenantId: number,
  conversationId: number,
  tagId: number,
) =>
  apiFetch<{ ok: boolean }>(`/tenants/${tenantId}/conversations/${conversationId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tagId }),
  });

export const removeConversationTag = (
  tenantId: number,
  conversationId: number,
  tagId: number,
) =>
  apiFetch<void>(
    `/tenants/${tenantId}/conversations/${conversationId}/tags/${tagId}`,
    { method: "DELETE" },
  );

// Custom fields
export const listCustomFields = (tenantId: number) =>
  apiFetch<CustomField[]>(`/tenants/${tenantId}/custom-fields`);

export const createCustomField = (
  tenantId: number,
  body: { name: string; type?: CustomField["type"]; options?: string[]; position?: number },
) =>
  apiFetch<CustomField>(`/tenants/${tenantId}/custom-fields`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const deleteCustomField = (tenantId: number, fieldId: number) =>
  apiFetch<void>(`/tenants/${tenantId}/custom-fields/${fieldId}`, { method: "DELETE" });

// Deals
export const listDealStages = (tenantId: number) =>
  apiFetch<DealStage[]>(`/tenants/${tenantId}/deal-stages`);

export const createDealStage = (
  tenantId: number,
  body: { name: string; color?: string; position?: number },
) =>
  apiFetch<DealStage>(`/tenants/${tenantId}/deal-stages`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateDealStage = (
  tenantId: number,
  stageId: number,
  body: Partial<{ name: string; color: string; position: number }>,
) =>
  apiFetch<DealStage>(`/tenants/${tenantId}/deal-stages/${stageId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteDealStage = (tenantId: number, stageId: number) =>
  apiFetch<void>(`/tenants/${tenantId}/deal-stages/${stageId}`, { method: "DELETE" });

export const listDeals = (
  tenantId: number,
  params: { stageId?: number; assignedTo?: string; status?: string; from?: string; to?: string } = {},
) => {
  const qs = new URLSearchParams();
  if (params.stageId) qs.set("stageId", String(params.stageId));
  if (params.assignedTo) qs.set("assignedTo", params.assignedTo);
  if (params.status) qs.set("status", params.status);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  return apiFetch<Deal[]>(`/tenants/${tenantId}/deals?${qs}`);
};

export const createDeal = (
  tenantId: number,
  body: {
    contactId: number;
    stageId: number;
    title: string;
    value?: number | null;
    assignedTo?: string | null;
    description?: string | null;
    expectedCloseAt?: string | null;
  },
) =>
  apiFetch<Deal>(`/tenants/${tenantId}/deals`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateDeal = (
  tenantId: number,
  dealId: number,
  body: Partial<{
    stageId: number;
    title: string;
    value: number | null;
    assignedTo: string | null;
    description: string | null;
    expectedCloseAt: string | null;
    status: "open" | "won" | "lost";
  }>,
) =>
  apiFetch<Deal>(`/tenants/${tenantId}/deals/${dealId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteDeal = (tenantId: number, dealId: number) =>
  apiFetch<void>(`/tenants/${tenantId}/deals/${dealId}`, { method: "DELETE" });

// ---------------------------------------------------------------------------
// Reports & analytics
// ---------------------------------------------------------------------------
export interface ReportFilters {
  from?: string;
  to?: string;
  departmentId?: number;
  agentId?: string;
  tagId?: number;
  [key: string]: unknown;
}

function reportQs(params: Record<string, unknown> = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  return qs.toString();
}

export interface ReportOverview {
  period: {
    total: number;
    closed: number;
    avgFirstResponseSecs: number | null;
    avgResolutionSecs: number | null;
    avgRating: number | null;
    ratingCount: number;
    /** % das conversas atendidas dentro da meta. null = ninguém foi atendido. */
    slaPct: number | null;
    /** A meta em segundos, para a tela poder dizer qual é. */
    slaTargetSecs: number;
  };
  live: { active: number; waiting: number; inIvr: number; closedToday: number };
}

export interface VolumePoint {
  bucket: string;
  total: number;
  closed: number;
}

export interface AgentReportRow {
  agentId: string;
  handled: number;
  closed: number;
  avgFirstResponseSecs: number | null;
  avgResolutionSecs: number | null;
  avgRating: number | null;
  ratingCount: number;
}

export interface DepartmentReportRow {
  departmentId: number;
  departmentName: string;
  departmentColor: string | null;
  total: number;
  closed: number;
  resolutionRate: number | null;
  avgFirstResponseSecs: number | null;
  avgResolutionSecs: number | null;
}

export interface FunnelReport {
  stages: {
    stageId: number;
    name: string;
    color: string;
    position: number;
    openCount: number;
    openValue: string;
  }[];
  won: { count: number; value: string };
  lost: { count: number; value: string };
}

export interface ConversationReportRow {
  id: number;
  status: ConversationStatus;
  createdAt: string;
  closedAt: string | null;
  assignedTo: string | null;
  departmentName: string | null;
  contactName: string | null;
  contactPhone: string;
  firstResponseSecs: number | null;
  resolutionSecs: number | null;
}

export const getReportOverview = (tenantId: number, f: ReportFilters = {}) =>
  apiFetch<ReportOverview>(`/tenants/${tenantId}/reports/overview?${reportQs(f)}`);

export const getReportVolume = (
  tenantId: number,
  f: ReportFilters & { granularity?: "hour" | "day" | "week" | "month" } = {},
) => apiFetch<VolumePoint[]>(`/tenants/${tenantId}/reports/volume?${reportQs(f)}`);

export const getReportAgents = (tenantId: number, f: ReportFilters = {}) =>
  apiFetch<AgentReportRow[]>(`/tenants/${tenantId}/reports/agents?${reportQs(f)}`);

export const getReportDepartments = (tenantId: number, f: ReportFilters = {}) =>
  apiFetch<DepartmentReportRow[]>(
    `/tenants/${tenantId}/reports/departments?${reportQs(f)}`,
  );

export const getReportFunnel = (tenantId: number, f: ReportFilters = {}) =>
  apiFetch<FunnelReport>(`/tenants/${tenantId}/reports/funnel?${reportQs(f)}`);

export const getReportConversations = (
  tenantId: number,
  f: ReportFilters & { limit?: number } = {},
) =>
  apiFetch<ConversationReportRow[]>(
    `/tenants/${tenantId}/reports/conversations?${reportQs(f)}`,
  );

export const reportConversationsCsvUrl = (tenantId: number, f: ReportFilters = {}) =>
  `${API_BASE}/tenants/${tenantId}/reports/conversations?${reportQs({ ...f, format: "csv" })}`;

// ---------------------------------------------------------------------------
// Simulador de atendimento — demonstrar o fluxo sem celular pareado.
// A mensagem entra pelo mesmo caminho do webhook; ver routes/simulador.ts.
// ---------------------------------------------------------------------------

export interface SimuladorPersona {
  id: string;
  nome: string;
  canal: ChannelType;
  telefone: string;
  descricao: string;
}

export interface SimuladorMensagem {
  id: number;
  direction: "inbound" | "outbound";
  content: string | null;
  timestamp: string;
  sentBy: string | null;
}

export interface SimuladorConversa {
  conversaId: number | null;
  status: ConversationStatus | null;
  departmentId?: number | null;
  mensagens: SimuladorMensagem[];
}

export const listSimuladorPersonas = (tenantId: number) =>
  apiFetch<SimuladorPersona[]>(`/tenants/${tenantId}/simulador/personas`);

export const enviarMensagemSimulada = (
  tenantId: number,
  personaId: string,
  texto: string,
) =>
  apiFetch<SimuladorConversa>(`/tenants/${tenantId}/simulador/mensagem`, {
    method: "POST",
    body: JSON.stringify({ personaId, texto }),
  });

export const getConversaSimulada = (tenantId: number, personaId: string) =>
  apiFetch<SimuladorConversa>(
    `/tenants/${tenantId}/simulador/conversa/${personaId}`,
  );

export const limparSimulador = (tenantId: number) =>
  apiFetch<{ conversasApagadas: number }>(
    `/tenants/${tenantId}/simulador/limpar`,
    { method: "POST" },
  );

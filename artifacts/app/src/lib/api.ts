/**
 * Typed fetch helpers for the new API endpoints.
 * All paths are relative to /api-server/api.
 */

const API_BASE = "/api-server/api";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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

export interface Contact {
  id: number;
  phone: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
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

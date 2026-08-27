/**
 * Socket.io client — authenticated singleton.
 *
 * Call `initSocket(token)` with a Clerk session token before using.
 * The server also accepts cookie-based auth, but the explicit token
 * ensures the connection works even when cookies are restricted.
 */
import { io, type Socket } from "socket.io-client";
import { SOCKET_ORIGIN, SOCKET_PATH, transportHeaders } from "./apiBase";

let _socket: Socket | null = null;



/**
 * Initialize (or reconnect) the socket with a fresh Clerk session token.
 * Safe to call multiple times — recreates the socket only when necessary.
 */
export function initSocket(token: string | null): Socket {
  // Reuse both connected AND connecting sockets — recreating a socket that
  // is mid-handshake would orphan listeners attached by other consumers
  // (e.g. Sidebar notifications vs. chat pages racing on getToken()).
  if (_socket && (_socket.connected || _socket.active)) return _socket;

  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }

  _socket = io(SOCKET_ORIGIN, {
    path: SOCKET_PATH,
    withCredentials: true,
    auth: token ? { token } : {},
    // websocket primeiro: o handshake nao passa pela interstitial do ngrok,
    // e o navegador nao permite headers customizados nesse transporte.
    transports: ["websocket", "polling"],
    // Vale so para o fallback de polling, que e HTTP comum.
    extraHeaders: transportHeaders,
    autoConnect: true,
  });

  // Reconexao automatica do socket.io: refaz o join, senao o socket volta sem
  // room nenhum e o agente some da central.
  _socket.io.on("reconnect", entrarNaCentral);

  return _socket;
}

/**
 * Entra na central e REENTRA a cada reconexao.
 *
 * O socket.io reconecta sozinho depois de uma queda de rede, mas com um id novo
 * e sem nenhum room. Emitir `join_tenant` uma unica vez deixava o atendente
 * fora da central apos qualquer oscilacao: o painel voltava a dizer "conectado"
 * enquanto o servidor o tinha marcado offline, e a fila parava de lhe mandar
 * conversas ate um F5.
 *
 * O ouvinte de reconexao fica no GERENCIADOR (`socket.io`), nao no socket: as
 * telas chamam `socket.off("connect")` ao desmontar, o que apagaria um ouvinte
 * registrado no socket — inclusive o de outra tela ainda montada.
 */
let _tenantId: number | null = null;

function entrarNaCentral(): void {
  if (_socket && _tenantId !== null) {
    _socket.emit("join_tenant", _tenantId);
    _socket.emit("join_agent");
  }
}

export function joinTenant(socket: Socket, tenantId: number): void {
  _tenantId = tenantId;
  if (socket.connected) entrarNaCentral();
  else socket.once("connect", entrarNaCentral);
}

/**
 * Returns the current socket without creating a new one.
 * Returns null if initSocket has not been called yet.
 */
export function getSocket(): Socket | null {
  return _socket;
}

export function disconnectSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
  _tenantId = null;
}

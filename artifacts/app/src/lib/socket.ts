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

  return _socket;
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
}

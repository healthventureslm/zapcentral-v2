/**
 * QR attribution marker helpers.
 *
 * The public QR page appends "(QR-xxxxxx)" — the first 6 hex chars of the
 * tenant's share token — to the pre-filled wa.me message. The inbound
 * webhook uses this to attribute the contact's origin to the QR channel.
 */

const MARKER_RE = /\bQR-([a-f0-9]{6})\b/;

/** Extracts the 6-hex-char marker payload from a message, if present. */
export function extractQrMarker(content: string): string | null {
  return MARKER_RE.exec(content)?.[1] ?? null;
}

/** True when the message carries a marker matching the tenant's share token. */
export function matchesQrMarker(
  content: string,
  qrShareToken: string | null | undefined,
): boolean {
  const marker = extractQrMarker(content);
  return !!marker && !!qrShareToken && qrShareToken.startsWith(marker);
}

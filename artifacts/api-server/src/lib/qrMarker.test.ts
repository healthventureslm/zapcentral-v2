import { describe, it, expect } from "vitest";
import { extractQrMarker, matchesQrMarker } from "./qrMarker";

const TOKEN = "abc123def4567890abc123def4567890abc123de";

describe("extractQrMarker", () => {
  it("finds the marker anywhere in the message", () => {
    expect(extractQrMarker("Olá! Gostaria de atendimento.\n\n(QR-abc123)")).toBe("abc123");
    expect(extractQrMarker("QR-abc123")).toBe("abc123");
  });
  it("returns null when absent or malformed", () => {
    expect(extractQrMarker("Olá, tudo bem?")).toBeNull();
    expect(extractQrMarker("QR-ABC123")).toBeNull(); // uppercase not valid
    expect(extractQrMarker("QR-abc12")).toBeNull(); // too short
  });
});

describe("matchesQrMarker", () => {
  it("matches when marker is the token prefix", () => {
    expect(matchesQrMarker("Olá (QR-abc123)", TOKEN)).toBe(true);
  });
  it("rejects a marker from another tenant's token", () => {
    expect(matchesQrMarker("Olá (QR-ffffff)", TOKEN)).toBe(false);
  });
  it("rejects when tenant has no share token", () => {
    expect(matchesQrMarker("Olá (QR-abc123)", null)).toBe(false);
    expect(matchesQrMarker("Olá (QR-abc123)", undefined)).toBe(false);
  });
  it("rejects messages without a marker", () => {
    expect(matchesQrMarker("Olá, preciso de ajuda", TOKEN)).toBe(false);
  });
});

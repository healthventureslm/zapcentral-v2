import { describe, it, expect } from "vitest";
import { normalizeCpf, isValidCpf, formatCpf } from "./cpf";

describe("normalizeCpf", () => {
  it("strips formatting", () => {
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725");
    expect(normalizeCpf(" 529 982 247 25 ")).toBe("52998224725");
  });
});

describe("isValidCpf", () => {
  it("accepts valid CPFs (formatted or plain)", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("111.444.777-35")).toBe(true);
  });

  it("rejects wrong check digits", () => {
    expect(isValidCpf("52998224724")).toBe(false);
    expect(isValidCpf("52998224715")).toBe(false);
  });

  it("rejects repeated-digit sequences", () => {
    for (const d of "0123456789") {
      expect(isValidCpf(d.repeat(11))).toBe(false);
    }
  });

  it("rejects wrong lengths and empty input", () => {
    expect(isValidCpf("")).toBe(false);
    expect(isValidCpf("1234567890")).toBe(false);
    expect(isValidCpf("123456789012")).toBe(false);
  });
});

describe("formatCpf", () => {
  it("formats an 11-digit CPF", () => {
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
  });
  it("passes through non-11-digit values", () => {
    expect(formatCpf("123")).toBe("123");
  });
});

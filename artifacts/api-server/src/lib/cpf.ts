/**
 * Brazilian CPF validation — format + check digits.
 */

/** Strips non-digits from a CPF string. */
export function normalizeCpf(input: string): string {
  return input.replace(/\D/g, "");
}

/** Validates an 11-digit CPF using the official check-digit algorithm. */
export function isValidCpf(input: string): boolean {
  const cpf = normalizeCpf(input);
  if (cpf.length !== 11) return false;
  // Reject sequences like 00000000000, 11111111111, ...
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);

  const calcCheckDigit = (count: number): number => {
    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += digits[i]! * (count + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calcCheckDigit(9) === digits[9] && calcCheckDigit(10) === digits[10];
}

/** Formats digits-only CPF as 000.000.000-00 (returns input unchanged if not 11 digits). */
export function formatCpf(cpf: string | null | undefined): string {
  if (!cpf || cpf.length !== 11) return cpf ?? "";
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

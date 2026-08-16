/** Brazilian CPF helpers (mirror of the server-side validation). */

export function normalizeCpf(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidCpf(input: string): boolean {
  const cpf = normalizeCpf(input);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const digits = cpf.split("").map(Number);
  const calc = (count: number): number => {
    let sum = 0;
    for (let i = 0; i < count; i++) sum += digits[i]! * (count + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === digits[9] && calc(10) === digits[10];
}

export function formatCpf(cpf: string | null | undefined): string {
  if (!cpf || cpf.length !== 11) return cpf ?? "";
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

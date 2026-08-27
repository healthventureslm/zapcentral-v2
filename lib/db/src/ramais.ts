/**
 * Os ramais reais do hospital, na ordem pedida pela equipe.
 *
 * Vive em arquivo proprio porque duas coisas precisam da mesma lista e nao
 * podem divergir: o seed de demonstracao (`seedDemo.ts`), que popula uma
 * central inteira com movimento falso, e o de producao (`seedRamais.ts`), que
 * cria SO os ramais num banco de verdade.
 *
 * Se a lista mudar, muda nos dois de uma vez.
 */
export const RAMAIS = [
  { nome: "Emergência — Médicos", cor: "#ef4444" },
  { nome: "UTI — Médicos", cor: "#f97316" },
  { nome: "UCI — Médicos", cor: "#eab308" },
  { nome: "USI — Médicos", cor: "#84cc16" },
  { nome: "TMO — Médicos", cor: "#22c55e" },
  { nome: "UI 1 — Médicos", cor: "#14b8a6" },
  { nome: "UI 2 — Médicos", cor: "#06b6d4" },
  { nome: "UI 3 — Médicos", cor: "#3b82f6" },
  { nome: "Centro Cirúrgico — Médicos", cor: "#8b5cf6" },
  { nome: "Radiologia — Médicos", cor: "#ec4899" },
];

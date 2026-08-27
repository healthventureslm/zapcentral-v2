import type { ReactNode } from "react";
import { PageHeader } from "@healthventureslm/design-system";
import { Sidebar } from "@/components/Sidebar";

/**
 * Moldura das telas de documento — navegacao, titulo e area de conteudo.
 *
 * Existe porque cada tela tinha inventado a propria. Havia cinco formatos de
 * cabecalho (com icone, sem icone, com subtitulo, com acoes, dentro de um div
 * extra) e quatro de conteudo (`p-8`, `p-8 max-w-4xl`, centralizado,
 * `flex-1`), entao mudar de tela deslocava o titulo e a primeira linha do
 * texto. Um componente so torna o desalinhamento impossivel, em vez de
 * corrigi-lo doze vezes.
 *
 * Nao serve para as telas de conversa (Atendimento e Equipe): ali o painel
 * ocupa a altura toda e nao tem titulo de pagina.
 */
export function PageShell({
  title,
  subtitle,
  icon,
  actions,
  onBack,
  width = "regular",
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  /** Acoes alinhadas a direita do titulo (botoes, filtros, selos). */
  actions?: ReactNode;
  /**
   * Mostra o controle de voltar. Recebe um handler, e nao um destino: o
   * PageHeader com `backTo` navega por href, o que recarrega a pagina inteira
   * e mata o roteamento do SPA.
   */
  onBack?: () => void;
  /**
   * `regular` cobre a maioria das telas. `wide` e para tabelas largas e
   * quadros, que precisam da tela inteira.
   */
  width?: "regular" | "wide";
  children: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <Sidebar />
      <main className="ml-64 p-8 print:ml-0">
        {/*
         * Centralizado, e nao encostado a esquerda. Com a barra ocupando 16rem
         * e um limite de largura no conteudo, o alinhamento a esquerda deixava
         * uma faixa morta a direita que crescia com o monitor.
         *
         * `wide` tambem tem teto: sem ele, uma tabela de sete colunas se estica
         * de ponta a ponta numa tela ultrawide e a linha fica impossivel de
         * seguir com os olhos.
         */}
        <div
          className={
            width === "wide" ? "max-w-7xl mx-auto" : "max-w-5xl mx-auto"
          }
        >
          <PageHeader
            title={title}
            {...(subtitle ? { subtitle } : {})}
            {...(icon ? { icon } : {})}
            {...(actions ? { actions } : {})}
            {...(onBack ? { back: true, onBack } : {})}
          />
          <div className="mt-6 space-y-6">{children}</div>
        </div>
      </main>
    </div>
  );
}

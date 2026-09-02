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
  children: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <Sidebar />
      <main className="ml-64 p-8 print:ml-0">
        {/*
         * Uma largura para todas as telas, centralizada.
         *
         * Havia duas — uma para formularios e outra para tabelas — e isso
         * recriava o problema que este componente existe para resolver: ir do
         * painel para o WhatsApp mudava a largura do conteudo, e as telas
         * deixavam de casar entre si.
         *
         * O teto tambem evita que uma tabela de sete colunas se estique de
         * ponta a ponta numa tela ultrawide, onde o olho perde a altura da
         * linha no meio do caminho.
         */}
        <div className="max-w-7xl mx-auto">
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

import { useLocation } from "wouter";
import { Users, KanbanSquare } from "lucide-react";
import { Tabs } from "@healthventureslm/design-system";

/**
 * Alternancia entre Contatos e Funil.
 *
 * Usa o Tabs do design system, que e so a barra: a navegacao continua com o
 * roteador, e nao com estado local — cada aba e uma rota propria.
 *
 * O componente anterior tinha `px-8` e `bg-card` porque vivia num cabecalho de
 * largura total. Dentro da moldura de pagina isso virava recuo em cima de
 * recuo, e a barra nao alinhava com o conteudo abaixo dela.
 */
export function CrmTabs() {
  const [location, setLocation] = useLocation();

  return (
    <Tabs
      value={location === "/crm/funil" ? "funil" : "contatos"}
      onChange={(v) => setLocation(v === "funil" ? "/crm/funil" : "/crm")}
      items={[
        {
          value: "contatos",
          label: "Contatos",
          icon: <Users className="w-4 h-4" />,
        },
        {
          value: "funil",
          label: "Funil de vendas",
          icon: <KanbanSquare className="w-4 h-4" />,
        },
      ]}
    />
  );
}

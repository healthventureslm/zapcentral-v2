/**
 * Avisa quem manda quando um ramal fica com fila e sem ninguem para atender.
 *
 * A faixa "Operacao agora" ja mostra isso em vermelho — mas so para quem
 * estiver com o painel aberto e olhando. Este aviso e o que alcanca quem nao
 * esta olhando.
 *
 * So admin e supervisor recebem. Para o atendente, o aviso nao acionaria acao
 * nenhuma: ele nao remaneja equipe, e o unico efeito seria alarme sobre um
 * problema que nao esta na mao dele.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/devAuth";
import { initSocket, getSocket, joinTenant } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { tocarAviso } from "@/lib/aviso";

interface AvisoDeRamal {
  departmentId: number;
  departmentName: string;
  esperando: number;
}

export function useRamalDescoberto(
  tenantId: number | null,
  papel: string | null,
): void {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const mandaNaCentral = papel === "admin" || papel === "supervisor";

  useEffect(() => {
    if (!tenantId || !mandaNaCentral) return;
    let cancelado = false;

    const handler = (dados: AvisoDeRamal) => {
      // A faixa "Operacao agora" precisa refletir o mesmo estado do aviso: sem
      // isto, o toast diria uma coisa e a tela atras dele, outra, ate o proximo
      // refetch.
      void qc.invalidateQueries({ queryKey: ["agents", "status", tenantId] });
      void qc.invalidateQueries({ queryKey: ["conversations", "waiting", tenantId] });

      tocarAviso();
      toast({
        variant: "destructive",
        title: `${dados.departmentName} está sem atendente`,
        description:
          dados.esperando === 1
            ? "1 pessoa esperando e ninguém disponível para atender."
            : `${dados.esperando} pessoas esperando e ninguém disponível para atender.`,
      });
    };

    void getToken().then((token) => {
      if (cancelado) return;
      const socket = initSocket(token);
      joinTenant(socket, tenantId);
      socket.on("ramal_descoberto", handler);
    });

    return () => {
      cancelado = true;
      getSocket()?.off("ramal_descoberto", handler);
    };
  }, [tenantId, mandaNaCentral, getToken, toast, qc]);
}

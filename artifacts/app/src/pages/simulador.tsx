/**
 * Simulador de atendimento — mostrar a central funcionando sem celular.
 *
 * A tela nao finge nada: cada mensagem enviada aqui entra pelo mesmo caminho do
 * webhook do WhatsApp, e o que aparece do lado direito e o que o robo respondeu
 * de verdade. O que o atendente escrever no Atendimento aparece aqui em
 * segundos, e vice-versa.
 */
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Loader2,
  MessageCircle,
  RotateCcw,
  Send,
  Smartphone,
  ArrowRight,
} from "lucide-react";
import { Sidebar } from "./dashboard";
import { useTenantId } from "@/hooks/useTenantId";
import { useToast } from "@/hooks/use-toast";
import {
  enviarMensagemSimulada,
  getChannelSettings,
  getConversaSimulada,
  limparSimulador,
  listSimuladorPersonas,
  type SimuladorConversa,
} from "@/lib/api";

/** Rotulo humano do estado da conversa, na linguagem do produto. */
const ESTADO: Record<string, { texto: string; cor: string }> = {
  new: { texto: "Chegou agora", cor: "bg-muted text-foreground" },
  ivr: { texto: "No robô, escolhendo o ramal", cor: "bg-blue-100 text-blue-700" },
  waiting: { texto: "Na fila do ramal", cor: "bg-amber-100 text-amber-700" },
  active: { texto: "Em atendimento", cor: "bg-green-100 text-green-700" },
  closed: { texto: "Encerrada", cor: "bg-muted text-muted-foreground" },
};

/**
 * Renderiza o negrito do WhatsApp (`*assim*`).
 *
 * O robo e a assinatura do atendente usam essa marcacao, que o WhatsApp e o
 * Telegram exibem em negrito. Sem tratar aqui, o simulador mostraria o
 * asterisco cru e daria a impressao de texto mal formatado — justamente na tela
 * que existe para mostrar como o paciente ve.
 */
function comNegrito(texto: string) {
  return texto.split(/(\*[^*\n]+\*)/g).map((parte, i) =>
    parte.startsWith("*") && parte.endsWith("*") && parte.length > 2 ? (
      <strong key={i}>{parte.slice(1, -1)}</strong>
    ) : (
      parte
    ),
  );
}

function Passo({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
          {numero}
        </span>
        <h2 className="font-semibold text-foreground text-sm">{titulo}</h2>
      </div>
      {children}
    </div>
  );
}

export default function SimuladorPage() {
  const tenantId = useTenantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [personaId, setPersonaId] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const fimDaConversa = useRef<HTMLDivElement>(null);

  const { data: personas } = useQuery({
    queryKey: ["simulador", "personas", tenantId],
    queryFn: () => listSimuladorPersonas(tenantId!),
    enabled: !!tenantId,
  });

  // O menu de verdade da central. Os atalhos numericos sao montados a partir
  // dele: um atalho fixo "1, 2, 3" mentiria assim que alguem mexesse no menu.
  const { data: settings } = useQuery({
    queryKey: ["channel-settings", tenantId],
    queryFn: () => getChannelSettings(tenantId!),
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!personaId && personas?.length) setPersonaId(personas[0]!.id);
  }, [personas, personaId]);

  const { data: conversa } = useQuery<SimuladorConversa>({
    queryKey: ["simulador", "conversa", tenantId, personaId],
    queryFn: () => getConversaSimulada(tenantId!, personaId!),
    enabled: !!tenantId && !!personaId,
    // A resposta do atendente chega pelo painel, nao por aqui. Sem esta busca
    // periodica o simulador mostraria so metade do dialogo.
    refetchInterval: 3000,
  });

  useEffect(() => {
    fimDaConversa.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversa?.mensagens.length]);

  const enviar = useMutation({
    mutationFn: (t: string) => enviarMensagemSimulada(tenantId!, personaId!, t),
    onSuccess: (nova) => {
      queryClient.setQueryData(
        ["simulador", "conversa", tenantId, personaId],
        nova,
      );
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (err: Error) =>
      toast({ title: "Não foi possível enviar", description: err.message }),
  });

  const limpar = useMutation({
    mutationFn: () => limparSimulador(tenantId!),
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: ["simulador"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({
        title: "Simulador zerado",
        description: `${r.conversasApagadas} conversa(s) de demonstração apagada(s). Os pacientes reais não foram tocados.`,
      });
    },
  });

  const personaAtual = personas?.find((p) => p.id === personaId) ?? null;
  const mensagens = conversa?.mensagens ?? [];
  const opcoesDoMenu = settings?.menuOptions ?? [];

  function mandar(t: string) {
    const limpo = t.trim();
    if (!limpo || !personaId || enviar.isPending) return;
    setTexto("");
    enviar.mutate(limpo);
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <Sidebar />

      <div className="ml-64 flex flex-col">
        <header className="h-16 bg-card shadow-sm flex items-center justify-between px-8">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Simulador de atendimento
            </h1>
            <p className="text-xs text-muted-foreground">
              Escreva como um paciente e veja a central responder — sem precisar
              de celular pareado.
            </p>
          </div>
          <button
            onClick={() => limpar.mutate()}
            disabled={limpar.isPending}
            className="border border-border hover:bg-muted text-foreground px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {limpar.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Zerar demonstração
          </button>
        </header>

        <main className="flex-1 p-8">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
            {/* ------------------------------------------------- coluna esquerda */}
            <div className="space-y-4">
              <Passo numero={1} titulo="Escolha quem está escrevendo de fora">
                <div className="grid sm:grid-cols-3 gap-3">
                  {!personas && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {personas?.map((p) => {
                    const ativa = p.id === personaId;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setPersonaId(p.id)}
                        className={`text-left rounded-lg border p-3 transition-colors ${
                          ativa
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border hover:border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                              p.canal === "telegram"
                                ? "bg-sky-100 text-sky-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {p.canal}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {p.nome}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {p.descricao}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  Os três caem na <strong>mesma fila</strong>, com os mesmos
                  ramais e o mesmo relatório. Quem decide por onde a resposta sai
                  é o canal do contato — não a tela de quem atende.
                </p>
              </Passo>

              <Passo numero={2} titulo="Mande a primeira mensagem">
                <div className="flex gap-2">
                  <input
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") mandar(texto);
                    }}
                    placeholder="Ex: Oi, preciso falar com a Emergência"
                    className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={() => mandar(texto)}
                    disabled={!texto.trim() || enviar.isPending}
                    className="bg-primary hover:bg-primary/90 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    {enviar.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Enviar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    "Oi, preciso de ajuda",
                    "Boa tarde, é sobre um paciente internado",
                    "O resultado do exame já saiu?",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => mandar(s)}
                      className="text-xs border border-border hover:bg-muted rounded-full px-3 py-1 text-muted-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Passo>

              <Passo numero={3} titulo="Responda ao robô como o paciente faria">
                {opcoesDoMenu.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum ramal no menu ainda. Monte o menu em{" "}
                    <Link
                      href="/configuracoes-canal"
                      className="text-primary font-medium"
                    >
                      Atendimento automático
                    </Link>
                    .
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">
                      Estes são os ramais do menu de verdade desta central:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {opcoesDoMenu.map((o) => (
                        <button
                          key={o.key}
                          onClick={() => mandar(o.key)}
                          className="text-xs bg-muted border border-border hover:border-primary hover:bg-primary/5 rounded-lg px-3 py-1.5 text-foreground font-medium"
                        >
                          <span className="text-primary font-bold mr-1">
                            {o.key}
                          </span>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">
                    Depois do atendimento, a central pede uma nota de 1 a 5:
                  </p>
                  <div className="flex gap-2">
                    {["1", "2", "3", "4", "5"].map((n) => (
                      <button
                        key={n}
                        onClick={() => mandar(n)}
                        className="w-9 h-9 rounded-lg border border-border hover:border-primary text-sm font-semibold text-foreground"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </Passo>

              <div className="bg-[#0F1923] rounded-xl p-5 text-white">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm mb-1">
                      Agora abra o outro lado
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      A conversa que você acabou de criar está na fila do ramal.
                      Abra o Atendimento numa segunda aba e responda: a mensagem
                      aparece aqui no mesmo instante.
                    </p>
                    <Link
                      href="/atendimento"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg"
                    >
                      Ir para o Atendimento
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------- coluna direita */}
            <div className="bg-card rounded-xl shadow-sm overflow-hidden xl:sticky xl:top-8">
              <div className="bg-[#0F1923] px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold truncate">
                    {personaAtual?.nome ?? "Selecione uma pessoa"}
                  </p>
                  <p className="text-muted-foreground text-xs truncate">
                    {personaAtual
                      ? `${personaAtual.canal === "telegram" ? "Telegram" : "WhatsApp"} · ${personaAtual.telefone}`
                      : "—"}
                  </p>
                </div>
                {conversa?.status && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                      ESTADO[conversa.status]?.cor ?? "bg-muted text-foreground"
                    }`}
                  >
                    {ESTADO[conversa.status]?.texto ?? conversa.status}
                  </span>
                )}
              </div>

              <div className="h-[520px] overflow-y-auto p-4 bg-[#ECE5DD] space-y-2">
                {mensagens.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6">
                    <Smartphone className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                      A conversa aparece aqui
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Comece pelo passo 2. O que o robô responder é o robô de
                      verdade, não um roteiro.
                    </p>
                  </div>
                )}
                {mensagens.map((m) => {
                  const doPaciente = m.direction === "inbound";
                  return (
                    <div
                      key={m.id}
                      className={`flex ${doPaciente ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 shadow-sm ${
                          doPaciente
                            ? "bg-[#DCF8C6] text-foreground"
                            : "bg-card text-foreground"
                        }`}
                      >
                        {!doPaciente && (
                          <p className="text-[10px] font-semibold text-primary mb-0.5">
                            {m.sentBy ? "Atendente" : "Central (robô)"}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {comNegrito(m.content ?? "")}
                        </p>
                        <p className="text-[10px] text-muted-foreground text-right mt-1">
                          {new Date(m.timestamp).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={fimDaConversa} />
              </div>

              <div className="px-4 py-3 border-t border-border flex gap-2">
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") mandar(texto);
                  }}
                  placeholder="Escrever como esta pessoa…"
                  className="flex-1 border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  onClick={() => mandar(texto)}
                  disabled={!texto.trim() || enviar.isPending}
                  className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-40 text-white flex items-center justify-center shrink-0"
                >
                  {enviar.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

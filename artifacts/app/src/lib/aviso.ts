/**
 * Aviso de chamado novo: um bipe curto e um contador no titulo da aba.
 *
 * O painel ja mostrava um toast quando chegava conversa, mas toast e silencioso
 * e some sozinho: quem estava com a aba atras do navegador, ou olhando para
 * outra tela, nao ficava sabendo de nada. Num ramal de hospital isso e tempo de
 * resposta perdido sem ninguem perceber.
 */

/**
 * O som e gerado no navegador, e nao servido como arquivo.
 *
 * Um .mp3 seria um asset a versionar, servir e cachear — e a passar pelo
 * `BASE_PATH`, que ja e a origem de uma armadilha conhecida deste repositorio —
 * para meio segundo de bipe.
 */
let contexto: AudioContext | null = null;

export function tocarAviso(): void {
  try {
    // Criado na primeira vez, e nao no carregamento: navegador bloqueia audio
    // antes de qualquer interacao, e um contexto criado cedo demais nasce
    // suspenso e nunca toca.
    contexto ??= new AudioContext();
    if (contexto.state === "suspended") void contexto.resume();

    const oscilador = contexto.createOscillator();
    const volume = contexto.createGain();
    oscilador.connect(volume);
    volume.connect(contexto.destination);

    // Duas notas curtas, a segunda mais alta: um bipe so se confunde com
    // notificacao de qualquer outro programa aberto na mesma maquina.
    const agora = contexto.currentTime;
    oscilador.frequency.setValueAtTime(660, agora);
    oscilador.frequency.setValueAtTime(880, agora + 0.09);

    // A queda suave evita o estalo que um corte seco produz no alto-falante.
    volume.gain.setValueAtTime(0.0001, agora);
    volume.gain.exponentialRampToValueAtTime(0.18, agora + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, agora + 0.22);

    oscilador.start(agora);
    oscilador.stop(agora + 0.24);
  } catch {
    // Sem áudio disponível o painel continua inteiro — o aviso visual basta.
  }
}

let pendentes = 0;
let tituloOriginal: string | null = null;

function pintarTitulo(): void {
  tituloOriginal ??= document.title;
  document.title = pendentes > 0 ? `(${pendentes}) ${tituloOriginal}` : tituloOriginal;
}

/** Marca um chamado novo: soma no titulo da aba e toca o aviso. */
export function avisarChamadoNovo(): void {
  pendentes += 1;
  pintarTitulo();
  tocarAviso();
}

/** Zera o contador. Chamado quando a pessoa volta para a aba. */
export function limparAvisos(): void {
  if (pendentes === 0) return;
  pendentes = 0;
  pintarTitulo();
}

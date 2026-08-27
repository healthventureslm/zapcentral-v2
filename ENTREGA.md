# ENTREGA — ZapCentral

Guia único para subir, demonstrar e publicar o ZapCentral. Feito para quem clona
o repositório hoje e precisa dele no ar. Ler junto com [CLAUDE.md](CLAUDE.md),
que traz as regras de quem vai escrever código aqui.

---

## 1. O que o produto é

**Um ramal telefônico que atende por WhatsApp.**

Quem escreve para a central cai num menu — "1 Emergência, 2 UTI, 3 Radiologia" —
e a mensagem entra na fila daquele ramal, onde uma pessoa atende pelo painel.
Como um PABX, no aplicativo que o paciente já tem aberto.

Tudo o mais serve a isso: a fila é a espera do ramal, a ficha do contato é o
cadastro de quem ligou, o relatório é o registro de quem atendeu e quanto
demorou.

| Termo | No código | O que é |
|---|---|---|
| Ramal / Setor | `department` | Item do menu. Tem fila e atendentes |
| Central | `tenant` | O hospital ou clínica cliente |
| Atendente | `agent` | Quem loga no painel e responde |
| Contato | `contact` | Quem escreveu de fora |
| Conversa | `conversation` | Um atendimento. É a unidade de métrica |
| Robô / Menu | `ivr` | A árvore de opções |

O código é em inglês. **A interface é toda em português** — nenhuma string em
inglês pode chegar à tela, nem em estado vazio, nem em mensagem de erro.

---

## 2. Subir na sua máquina — um comando

Precisa de **Docker Desktop aberto** (espere ficar verde) e **Node 24+**.

```bash
node scripts/subir-tudo.mjs
```

Ele confere o ambiente, cria ou conserta o `.env`, sobe o Postgres e a Evolution
API em Docker, aplica as migrations, compila a API e o painel, popula os dados de
demonstração e sobe **um processo** que serve tudo na porta 8080. De 3 a 5
minutos na primeira vez.

Rodar de novo é seguro: o que já existe é reaproveitado, e nada com valor dentro
(senha, chave, token) é sobrescrito.

| | |
|---|---|
| Painel | http://localhost:8080 |
| Simulador | http://localhost:8080/simulador |
| WhatsApp (QR) | http://localhost:8080/whatsapp |

Para entrar, **clique no nome na lista**. Não pede senha (`DEV_AUTH_BYPASS=1`).

> Clique, não digite. A identidade vem de e-mail **e** nome juntos: um acento
> diferente gera outro usuário, sem vínculo com a central, e cai numa tela de
> "Acesso pendente".

### Opções

```
--so-preparar   prepara tudo e não sobe o servidor
--sem-seed      não popula os dados de demonstração
```

---

## 3. Parear o WhatsApp

**WhatsApp** na barra lateral → **Conectar WhatsApp** → escaneie o QR
(`WhatsApp → Menu → Aparelhos Conectados → Conectar aparelho`).

O QR expira em 60 segundos e se renova sozinho. Use um chip que não seja o
pessoal: esse número passa a ser o número da central, e quem escrever para ele
entra no sistema.

Não precisa de túnel: a Evolution roda em Docker na mesma máquina e alcança a API
por `host.docker.internal`.

Depois de parear, a tela precisa dizer **"Conectado"**. Se ficar em "Conectando",
escaneie de novo.

---

## 4. Telegram

O Telegram **exige webhook em HTTPS público** — não há como contornar. Para usá-lo
na sua máquina, é preciso um túnel.

**A ordem importa.** Defina a URL pública **antes** de parear qualquer canal: é ela
que é registrada como webhook. Trocar depois exige parear de novo.

1. `ngrok http 8080` e copie a URL HTTPS
2. No `.env`, `PUBLIC_URL=https://SEU-TUNEL.ngrok-free.app` (sem barra no final)
3. Reinicie o servidor — **só reiniciar, sem recompilar**:
   ```bash
   node --enable-source-maps --env-file-if-exists=.env artifacts/api-server/dist/index.mjs
   ```
4. `@BotFather` → `/newbot` → copie o token → cole na tela do Telegram. O servidor
   valida com `getMe` e registra o webhook sozinho.

O menu do robô sai com **botões** no Telegram; no WhatsApp, como texto numerado.
O mesmo menu, o mesmo código.

> Com URL pública e `DEV_AUTH_BYPASS=1`, quem tiver o endereço entra no painel sem
> senha. Para uma demonstração de algumas horas com uma URL que ninguém conhece, é
> aceitável. **Não deixe no ar depois** — derrube o túnel ao terminar. Para ficar
> no ar de verdade, configure o Clerk e tire o `DEV_AUTH_BYPASS` do `.env`.

---

## 5. Deploy em produção

### 5.1 O que precisa ser decidido antes

O painel é um site estático; a API é um processo Node que mantém **conexões
Socket.io abertas** e roda uma **varredura de minuto em minuto**. As duas coisas
exigem processo vivo entre requisições.

Isso dá três formas de publicar, e a escolha muda o que funciona:

| Forma | Painel | API | Tempo real | Varredura de inatividade |
|---|---|---|---|---|
| **A — processo único** (recomendado) | a própria API serve | host persistente | ✅ | ✅ |
| **B — painel no Vercel + API em host persistente** | Vercel | Railway / Render / Fly / VM | ✅ | ✅ |
| **C — tudo no Vercel** | Vercel | função serverless | ❌ cai para atualização por recarga | ❌ precisa de cron externo |

**A forma A é a mais simples**: `SERVE_APP=1` faz a API servir o painel, e aí é
uma URL só — painel, API, Socket.io e os dois webhooks na mesma origem. Nada
precisa saber o endereço de nada, e trocar de endereço é editar `PUBLIC_URL` e
reiniciar.

A forma C **não é impossível**, mas exige aceitar duas perdas: o painel deixa de
receber conversa nova sozinho (o dado aparece ao recarregar ou ao navegar) e o
encerramento automático por inatividade não roda, porque não há processo vivo
para o `setInterval`. Se a escolha for essa, a varredura precisa virar um endpoint
chamado por um agendador externo — hoje ela só existe dentro do processo.

**A Evolution também precisa de um lugar.** Ela guarda a sessão do WhatsApp e tem
que ser alcançável pela API. O `docker-compose.evolution.yml` sobe ela com o
Postgres e o Redis dela. Sem isso publicado, a produção não envia WhatsApp — o
painel funciona, o robô responde no simulador, e o canal fica mudo.

### 5.2 Publicar

```bash
git checkout main
git merge melhorias
git push origin main
```

`main` tem auto-deploy. Depois do push, confira nesta ordem:

1. **A API responde.** `GET /api/healthz` na URL da API precisa devolver 200.
2. **O painel sabe onde a API está.** Se painel e API estiverem em origens
   diferentes (formas B e C), o projeto do painel precisa de
   `VITE_API_BASE_URL` com a URL da API **no momento do build** — o endereço vai
   compilado para dentro do bundle. Trocar depois exige build novo.
   Na forma A, não existe essa variável: `SERVE_APP=1` resolve tudo na mesma
   origem.
3. **As migrations rodaram.** `pnpm --filter @workspace/db run migrate`, com
   `DATABASE_URL` exportada na mão — o `drizzle.config.ts` não lê o `.env` da raiz.
4. **As variáveis existem.** `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
   `VITE_CLERK_PUBLISHABLE_KEY`, `BOOTSTRAP_SECRET`, `EVOLUTION_API_URL`,
   `EVOLUTION_API_KEY`, `PUBLIC_URL`, `ALLOWED_ORIGINS`, `DATABASE_URL`.
   `DEV_AUTH_BYPASS` **não pode existir** em produção — o próprio código se recusa
   a subir com ele e `NODE_ENV=production`.

### 5.3 Os ramais em produção

Os dez ramais do hospital — Emergência, UTI, UCI, USI, TMO, UI 1, UI 2, UI 3,
Centro Cirúrgico e Radiologia, todos "— Médicos" — vêm no **seed de
demonstração**, que roda na sua máquina.

**Eles não aparecem em produção sozinhos.** E o `seed:demo` não serve lá: junto
com os ramais ele cria equipe fictícia, pacientes inventados, conversas com nota
de satisfação e apaga o movimento anterior da central. Num banco com atendimento
real, isso é perda de dado.

Para criar só os ramais, num banco de verdade:

```bash
DATABASE_URL="<url de producao>" pnpm --filter @workspace/db run seed:ramais
```

O que ele faz e o que não faz:

- Cria os dez ramais que faltarem. Não cria pessoa, não cria conversa, não apaga
  nada.
- É idempotente: o que já existe (pelo nome, dentro da central) fica como está —
  inclusive cor, descrição e status, que alguém pode ter editado pelo painel.
  Rodar de novo depois de desativar um ramal **não** o reativa.
- Monta o menu do robô com os quatro primeiros **apenas se ainda não houver
  menu**. Sobrescrever o menu de uma central em operação mudaria, sem aviso, o
  número que os pacientes já conhecem — quem digitasse "2" cairia noutra equipe.
- Com mais de uma central ativa, ele **para e lista as opções** em vez de
  escolher sozinho. Aí é `TENANT_SLUG=<slug>` na frente do comando.

Dez opções num menu ficam ilegíveis no celular, então o menu nasce com quatro. Os
outros seis existem e entram pelo painel, na ordem que o hospital quiser.

Alternativa: criar pelo painel, um a um, em **Ramais**. O e-mail da Health já tem
admin em produção.

### 5.4 Antes de dar merge, saiba disto

**`pnpm run build` na raiz falha.** O artifact `artifacts/zapcentral-deck` tem um
erro de typecheck **pré-existente**, anterior a esta branch, e o `build` da raiz
roda `typecheck` em todos os artifacts antes de compilar. Não é regressão e não
afeta o produto — o deck é um artifact órfão, sem referência em nada.

Para compilar só o que importa:

```bash
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/app run build
```

---

## 6. O que mudou nesta entrega

24 commits. Agrupados pelo que resolvem.

### Fila e atendimento

- **A fila nunca distribuía conversa nenhuma.** Três defeitos somados: ninguém
  nascia na tabela de status, `busy` era gravado pelo sistema e nunca revertido
  (o atendente pegava a primeira conversa da vida e sumia da fila para sempre), e
  ficar disponível não puxava a fila represada. Presença agora é real, pelo
  socket: abrir o painel marca disponível, fechar marca offline, e quem fica
  disponível puxa até 20 conversas paradas dos ramais dele.
- **Quem ficou preso em `busy` na versão antiga é liberado no boot.**
- **Transferência entre ramais** — botão no painel, aviso ao paciente e
  assinatura de quem transferiu.
- **Encerramento automático por inatividade.** A tela de Configurações já deixava
  escolher os minutos e o servidor nunca lia esse campo. Agora uma varredura roda
  de minuto em minuto, por central, só nas que ligaram a opção. A conversa que
  morreu sem chegar a ninguém não recebe pesquisa de satisfação — não há o que
  avaliar, e a nota puxaria a média do painel para a média do abandono.
- **A palavra MENU.** Quem caiu no ramal errado não tinha saída: o robô só escuta
  durante o menu. Agora `MENU` devolve a pessoa ao início, com confirmação
  SIM/NÃO — porque "menu" também aparece em conversa de verdade e não pode
  derrubar um atendimento em curso por engano.
- **A fila parou de prometer atendimento que não existe.** Dizia "assim que
  alguém estiver livre, respondemos por aqui" mesmo com o ramal inteiro offline.
  Agora olha a equipe antes de prometer, e oferece o MENU como saída.

- **O painel avisa quando chega chamado.** Havia só um toast silencioso: quem
  estava com a aba atrás do navegador não ficava sabendo de nada. Agora toca um
  bipe, o título da aba mostra quantos chamados esperam (`(2) ZapCentral`) e a
  conversa nova fica marcada na lista até alguém abrir. A conversa que já está
  aberta na tela não avisa — bipar a cada mensagem dela treinaria todo mundo a
  ignorar o aviso.
- **Alerta de ramal descoberto.** Quando um ramal fica com fila e sem ninguém
  disponível, o sistema avisa admins e supervisores — bipe e aviso vermelho —
  em vez de esperar que alguém esteja olhando a tela. De madrugada não há
  ninguém olhando, que é exatamente quando o problema acontece. Não é
  escalonamento: não sobe chamado individual por degrau nem tem prazo por
  conversa. É a versão coletiva da mesma pergunta.
- **Operação agora**, no painel: ramal por ramal, quantos esperando e **quem
  está disponível naquele ramal neste instante**. O ramal com fila e sem ninguém
  disponível aparece primeiro e em vermelho — é o único estado que exige ação
  imediata. Antes o painel só dizia quantas pessoas estavam online, num número
  só, que não responde a pergunta que o gestor faz de verdade: dez atendentes
  online não ajudam se os dois da Emergência foram almoçar.

### Robô e menu

- **Apagar um ramal deixava o robô travado no menu.** A renumeração podia mandar
  paciente para a equipe errada, em silêncio.
- **O robô confirma o ramal escolhido** e diz se já chamou alguém ou quantas
  pessoas há na frente. Antes, quem digitava "1" recebia silêncio até um atendente
  digitar algo — indistinguível de sistema quebrado.
- **Menu com botões no Telegram**, e três defeitos deles corrigidos: os botões
  nunca respondiam a toque, e tocar num botão antigo do histórico registrava nota
  1 na pesquisa de satisfação.

### Canais

- **WhatsApp real rodando local, sem túnel** — Evolution em Docker na mesma
  máquina.
- **A Evolution em laço de reinício** é detectada e o volume recriado. O sintoma
  que chegava à tela era "Evolution API não configurada".
- **Instância ausente na Evolution:** a tela do QR girava para sempre. Agora
  recria a instância.
- **A tela do WhatsApp não diz mais "Conectado"** sem provedor configurado.
- **Mensagem sem provedor é gravada**, em vez de perdida em silêncio.

### Painel e configuração

- **A configuração inicial criava a central e não saía da tela.**
- **Plataforma já configurada não mostra mais a configuração inicial.**
- **Entrar no painel com um clique**, sem digitar a identidade.
- **Gráfico do painel deixou de ser um ponto solto.**
- **Mensagens de erro traduzidas** — nenhuma string em inglês chegando à tela.

### Ambiente

- **Um comando sobe tudo** (`scripts/subir-tudo.mjs`), do zero, numa máquina nova.
- **Processo único**: com `SERVE_APP=1` a API serve o painel. Antes eram três
  processos e o endereço da API ia compilado dentro do build do painel — túnel
  reiniciado derrubava o site até um deploy novo.
- **Simulador de atendimento** (`/simulador`): injeta a mensagem no mesmo
  `handleInboundMessage` dos webhooks, com três personas, duas de WhatsApp e uma
  de Telegram, todas caindo na mesma fila. Serve para demonstrar sem celular
  pareado.
- **Desenvolver sem conta Clerk** (`DEV_AUTH_BYPASS=1`), que se recusa a subir em
  produção.
- **Seed com os dez ramais reais**: Emergência, UTI, UCI, USI, TMO, UI 1, UI 2,
  UI 3, Centro Cirúrgico e Radiologia — todos "— Médicos".

---

## 7. Invariantes — nunca quebrar

Se estas regras forem violadas, o produto fica errado ou perigoso. Qualquer
mudança que encoste nelas exige verificação explícita.

1. **Isolamento entre centrais.** Toda consulta filtra por `tenantId`. Não há RLS
   efetiva: a migration `0001_enable_rls.sql` liga RLS deny-all, mas a aplicação
   conecta como dona das tabelas. O isolamento é 100% código de aplicação. Um
   `eq(tenantId)` esquecido é vazamento entre hospitais.
2. **Idempotência do webhook.** O canal reentrega evento.
   `handleInboundMessage` descarta reentregas pelo par `(tenantId, messageId)`
   **antes de qualquer escrita**. Nunca mover essa checagem para depois de um
   efeito colateral.
3. **Uma conversa aberta por contato.** A busca por conversa viva usa
   `status NOT IN ('closed')`. Abrir uma segunda quebra a fila e as métricas.
4. **Atribuição não pode estourar capacidade.** `tryAssign` reivindica a conversa
   e incrementa a carga do atendente na mesma transação, os dois com `WHERE`
   condicional. Se o incremento não achar linha, a transação inteira volta atrás.
   Não simplificar: existe para uma corrida real.
5. **O canal de saída vem do contato.** Fila, ramal, robô, ficha e relatório são
   agnósticos de canal. Quem decide se a resposta sai por WhatsApp ou Telegram é o
   campo `channel` do contato, nunca a rota.

---

## 8. Onde as coisas moram

```
artifacts/api-server/src/
  routes/        HTTP: validação de entrada, autorização, resposta
  services/      Regra de negócio (inbound, ivr, encerramento,
                 inatividade, voltarAoMenu, socket, evolution, telegram)
  middlewares/   auth.ts — requireAuth, requireTenantMember, requireTenantAdmin
  lib/devAuth.ts Autenticação: Clerk real ou bypass de dev

artifacts/app/src/
  pages/         Uma tela por arquivo
  lib/api.ts     Cliente HTTP tipado, escrito à mão
  lib/apiBase.ts Onde a API vive (os três modos da seção 5.1)

lib/db/src/schema/   Fonte da verdade do banco (Drizzle)
lib/db/drizzle/      Migrations versionadas
```

**O coração do produto são dois arquivos:** `services/inbound.ts` (o que acontece
quando chega mensagem) e `services/ivr.ts` (o menu e o roteamento). Ler os dois
antes de mexer em qualquer coisa de atendimento.

O `routes/simulador.ts` é a terceira porta de entrada de mensagem, ao lado dos dois
webhooks, e chama o mesmo `handleInboundMessage`. Ele **não** reimplementa o
fluxo, de propósito: um simulador com lógica própria demonstraria o simulador, e
não o produto.

---

## 9. Armadilhas conhecidas do ambiente

Coisas que já custaram tempo.

| Sintoma | Causa e saída |
|---|---|
| `pnpm run` falha antes de executar | Pré-check de dependências. O script já passa `--config.verify-deps-before-run=false`; à mão, acrescente |
| `pnpm --filter @workspace/db run migrate` não acha o banco | O `drizzle.config.ts` lê `process.env.DATABASE_URL` direto, não o `.env` da raiz. Exportar na mão |
| Nada responde, nem `/api/healthz` | `clerkMiddleware` é global e lança com chave inválida. Use `DEV_AUTH_BYPASS=1` em dev |
| Painel abre em branco, erro de MIME no console | `BASE_PATH=/ pnpm build` no Git Bash do Windows: o MSYS reescreve `/` para `/Program Files/Git/`. Use `subir-tudo.mjs`, que define as variáveis por dentro do Node, ou compile pelo PowerShell |
| "Evolution API não configurada" | `EVOLUTION_API_URL` vazia, ou o Postgres dela em laço com `P1000` (a senha só vale na primeira criação do volume). Rode `subir-tudo.mjs` de novo — ele detecta e recria o volume |
| WhatsApp preso em "Conectando" | O QR expira em 60s. Escaneie de novo |
| Painel zerado, "sem dados no período" | `pnpm --filter @workspace/db run seed:demo` |
| Quero zerar as conversas de teste | Botão **Zerar demonstração**, na tela do Simulador. Só apaga o que o simulador criou |

Webhooks são públicos e vêm **antes** da autenticação em `routes/index.ts`. O da
Evolution valida o segredo apenas `if (instance.webhookSecret)` — falha aberta. O
do Telegram falha fechada, e é esse o padrão correto.

---

## 10. O que ainda não existe

Registrado para não haver surpresa em demonstração:

- **Plantão / escala** — sessão que termina no fim do turno e devolve as conversas
  para a fila.
- **Escalonamento por chamado** — chamado individual sem resposta subindo por
  degraus até supervisor de ramal e de hospital, com prazo próprio. O que existe
  hoje é o alerta coletivo (ramal descoberto), não a escada por conversa.
- **Controle de acesso por link** — quem de fora enxerga quais ramais, com
  registro de tentativa negada.
- **Menu em árvore** — ramal dentro de ramal, montado pelo admin.
- **Motivo de encerramento como coluna.** Hoje o motivo vai em texto no
  `closing_note`; `closed_by` nulo é a marca de "foi o sistema". Segmentar métrica
  por motivo exige migration.

E código morto que existe, não é usado e **não deve receber código novo**:
`lib/api-spec`, `lib/api-zod`, `lib/api-client-react` (stack OpenAPI/Orval, ~3.500
linhas — o painel usa `lib/api.ts` escrito à mão), `artifacts/mockup-sandbox`,
`artifacts/zapcentral-deck`, e cerca de 40 dos 55 componentes em `components/ui/`.
Remover é trabalho legítimo, mas separado.

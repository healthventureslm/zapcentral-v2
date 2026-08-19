# ZapCentral

Central operacional inteligente para atendimento via WhatsApp, com equipes,
setores, filas, CRM, chat interno e relatórios.

## Requisitos

- Node.js 24+
- pnpm
- PostgreSQL
- Uma aplicação Clerk configurada para autenticação

## Instalação

```bash
pnpm install
```

Configure as variáveis de ambiente no Replit Secrets ou em um arquivo local
que não seja versionado. Nunca publique valores reais de chaves no GitHub.

Para desenvolvimento local, copie o modelo e preencha os valores:

```text
cp .env.example .env
```

O arquivo `.env.example` lista todas as variáveis necessárias. Substitua os
placeholders apenas no `.env` local ou no gerenciador de secrets do ambiente.
Nunca publique valores reais de chaves no GitHub.

## Desenvolvimento

Em terminais separados:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/app run dev
```

Ou use o workflow configurado no Replit.

### Rodando fora do Replit

No Replit o prefixo `/api-server` é resolvido pelo router da plataforma. Local,
o dev server do Vite faz esse proxy (incluindo WebSocket do Socket.io), ativado
automaticamente quando `APP_PORT` está definida. As portas são separadas:

- `PORT` — API (padrão 8080)
- `APP_PORT` — dev server do Vite (padrão 5173); no Replit fica vazia
- `BASE_PATH` — base do frontend (`/` em local)

Ambos os processos leem o `.env` da raiz automaticamente.

Em Windows, o `pnpm-workspace.yaml` precisa permitir os binários nativos
`win32-x64` de rollup, esbuild, lightningcss e @tailwindcss/oxide — sem eles o
Vite não inicia.

## Banco de dados e migrations

As migrations versionadas ficam em `lib/db/drizzle`. O projeto inclui a
migration baseline `0000_initial.sql`, que cria o schema completo atual
(22 tabelas, enums, índices e relacionamentos).

Para criar uma migration depois de alterar os schemas em `lib/db/src/schema`:

```bash
pnpm --filter @workspace/db run generate
```

Para aplicar as migrations em um banco PostgreSQL **novo e vazio**:

```bash
pnpm --filter @workspace/db run migrate
```

> Não aplique a baseline em um banco que já tenha as tabelas do ZapCentral.
> No Replit, mudanças de schema em produção são aplicadas pelo fluxo de
> Publish, que compara o banco de desenvolvimento com o de produção.

## Canais

O atendimento é multicanal: uma central pode operar só WhatsApp, só Telegram,
ou os dois ao mesmo tempo. Fila, setores, IVR, CRM e relatórios são agnósticos
de canal — quem define por onde a resposta sai é o contato da conversa.

O contato é identificado por `(tenant, canal, external_id)`: telefone no
WhatsApp, `chat_id` no Telegram. Contatos de Telegram não têm telefone.

### WhatsApp

Pareamento por QR code, via Evolution API. Requer `EVOLUTION_API_URL` e
`EVOLUTION_API_KEY`.

### Telegram

Em **Telegram**, cole o token que o [@BotFather](https://t.me/BotFather) gerou
(`/newbot`). O servidor valida com `getMe` e registra o webhook sozinho. O
token fica só no servidor e nunca é devolvido ao navegador.

O webhook precisa de uma URL **HTTPS acessível publicamente** — defina
`PUBLIC_URL`. Expondo a API por ngrok:

```bash
ngrok http 8080
```

Copie a URL do túnel para `PUBLIC_URL`, reinicie a API e conecte o bot. No
plano gratuito do ngrok o endereço muda a cada reinício: a tela de Telegram
detecta isso ("o webhook não aponta mais para cá") e oferece **Reapontar
webhook**, sem precisar recolar o token.

Lembre de incluir a URL do túnel em `ALLOWED_ORIGINS` se o frontend for
servido por ela — vale para o CORS e para o Socket.io.

## Deploy

O frontend e a API sao implantados separadamente. A API mantem conexoes
Socket.io de longa duracao, o que funcoes serverless nao sustentam — por isso
ela precisa de um processo persistente (maquina local via tunel, Railway,
Render, Fly.io).

### Frontend no Vercel

O `vercel.json` na raiz ja instala o workspace inteiro e constroi so o app.
Deixe **Root Directory** vazio no painel do Vercel (o monorepo pnpm precisa
resolver `@workspace/*` a partir da raiz).

Variaveis de ambiente necessarias no projeto Vercel:

| Variavel | Valor |
| --- | --- |
| `BASE_PATH` | `/` |
| `VITE_API_BASE_URL` | URL publica da API, sem barra final |
| `VITE_CLERK_PUBLISHABLE_KEY` | chave publicavel do Clerk |

`VITE_API_BASE_URL` e o que separa os dois modos. Sem ela o app assume que a
API esta na mesma origem sob `/api-server` (local e Replit). Com ela, o app
chama a API direto — e como o cookie de sessao nao atravessa origens, o token
do Clerk passa a ir no header `Authorization`. Veja `src/lib/apiBase.ts`.

Do lado da API, inclua a URL do Vercel em `ALLOWED_ORIGINS` (vale para o CORS
e para o Socket.io) e autorize o dominio no painel do Clerk.

> Com ngrok gratuito o endereco muda a cada reinicio, e `VITE_API_BASE_URL` e
> embutida no build — trocar de URL exige novo deploy. Um dominio estatico do
> ngrok evita esse retrabalho.

## Verificações

```bash
pnpm run typecheck
pnpm run build
```

## Estrutura

- `artifacts/app` — frontend React + Vite
- `artifacts/api-server` — API Express
- `lib/db` — schema PostgreSQL com Drizzle
- `lib/api-client-react` — cliente de API
- `artifacts/zapcentral-deck` — apresentação do produto

## Configuração inicial

Depois de entrar no app com uma conta autorizada, a primeira pessoa
administradora usa a tela de configuração inicial para criar a central.
O convite de agentes, supervisores e administradores, além da criação de
setores, fica em **Configurações**.

## Segurança

Segredos, arquivos `.env`, dependências instaladas, caches e arquivos locais
do Replit são excluídos pelo `.gitignore`. Use o gerenciador de secrets do
ambiente para configurar credenciais.
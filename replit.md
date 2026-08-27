# ZapCentral

Um ramal telefônico que atende por WhatsApp: quem escreve para a central cai num
menu de ramais e a mensagem entra na fila daquele setor, onde uma pessoa atende
pelo painel.

> **A documentação do projeto é o [ENTREGA.md](ENTREGA.md).** Este arquivo é só o
> resumo que a plataforma lê. Onde os dois divergirem, o ENTREGA.md vence.

## Run & Operate

- `node scripts/subir-tudo.mjs` — sobe o ambiente inteiro (Docker, migrations,
  build, seed) e serve tudo em **:8080**. É o caminho normal.
- `pnpm run typecheck` — typecheck de todos os pacotes
- `pnpm --filter @workspace/db run migrate` — aplica as migrations (exige
  `DATABASE_URL` exportada na mão; o `drizzle.config.ts` não lê o `.env` da raiz)
- `pnpm --filter @workspace/db run seed:demo` — dados de demonstração (local)
- `pnpm --filter @workspace/db run seed:ramais` — só os ramais, seguro em produção

Env obrigatórias: `DATABASE_URL`, `PORT`. Para autenticação, as chaves do Clerk —
ou `DEV_AUTH_BYPASS=1` em desenvolvimento, que se recusa a subir em produção.

`pnpm run build` na raiz falha por erro de typecheck pré-existente em
`artifacts/zapcentral-deck`, artifact órfão. Compile por filtro.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express + Socket.io · Painel: React + Vite
- DB: PostgreSQL + Drizzle ORM · Validação: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild
- WhatsApp: Evolution API (QR) · Telegram: Bot API

## Where things live

```
artifacts/api-server/src/routes/      HTTP: validação, autorização, resposta
artifacts/api-server/src/services/    Regra de negócio
artifacts/app/src/pages/              Uma tela por arquivo
lib/db/src/schema/                    Fonte da verdade do banco
lib/db/drizzle/                       Migrations versionadas
```

O coração do produto são `services/inbound.ts` (o que acontece quando chega
mensagem) e `services/ivr.ts` (o menu e o roteamento).

## Architecture decisions

- **Processo único.** Com `SERVE_APP=1` a API serve o painel, e painel, API,
  Socket.io e webhooks respondem numa origem só. Antes o endereço da API ia
  compilado dentro do build do painel, e trocar de endereço exigia deploy novo.
- **A API precisa de processo persistente.** Socket.io de longa duração e uma
  varredura de minuto em minuto não sobrevivem em função serverless.
- **O canal de saída vem do contato**, nunca da rota. É o que mantém fila, robô e
  relatório agnósticos de WhatsApp ou Telegram.
- **Isolamento entre centrais é código de aplicação.** Não há RLS efetiva: toda
  consulta precisa filtrar por `tenantId`.
- **O cliente de API do painel é escrito à mão** (`lib/api.ts`). A stack
  OpenAPI/Orval em `lib/api-spec`, `lib/api-zod` e `lib/api-client-react` é código
  morto — não estender.

## Product

Menu de ramais por WhatsApp e Telegram, fila com distribuição automática,
transferência entre ramais, encerramento automático por inatividade, pesquisa de
satisfação, ficha do contato com tags e campos personalizados, chat interno entre
atendentes, relatórios com exportação CSV e um simulador que injeta mensagem no
mesmo caminho dos webhooks.

## Gotchas

Estão todas em [ENTREGA.md](ENTREGA.md) §9, com sintoma e saída. As três que mais
custam tempo: `BASE_PATH=/ pnpm build` sai errado no Git Bash do Windows; a senha
do Postgres da Evolution só vale na primeira criação do volume; e o
`clerkMiddleware` é global, então sem chave válida nem o health check responde.

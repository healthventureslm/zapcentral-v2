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

Variáveis principais:

```text
DATABASE_URL=
SESSION_SECRET=
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
VITE_CLERK_PUBLISHABLE_KEY=
BOOTSTRAP_SECRET=
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
```

## Desenvolvimento

Em terminais separados:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/app run dev
```

Ou use o workflow configurado no Replit.

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
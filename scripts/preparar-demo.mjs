/**
 * Prepara o ambiente de demonstracao do zero, numa maquina que nunca rodou o
 * projeto.
 *
 *   node scripts/preparar-demo.mjs
 *
 * Faz: cria o .env com segredos novos, sobe o Postgres e a Evolution API em
 * Docker, aplica as migrations, compila a API e popula o banco com os ramais do
 * hospital e um historico plausivel.
 *
 * Nao precisa de conta Clerk (o ambiente sobe com DEV_AUTH_BYPASS=1), nao
 * precisa de ngrok e nao precisa receber segredo de ninguem — tudo que e
 * secreto e gerado aqui.
 *
 * Rodar de novo e seguro: o que ja existe e reaproveitado.
 */
import { execSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = path.join(raiz, ".env");

const BANCO = "postgresql://zapcentral:zapcentral@localhost:5433/zapcentral";
const CONTAINER = "zapcentral-pg";

let passo = 0;
const titulo = (t) => console.log(`\n[${++passo}] ${t}`);
const ok = (t) => console.log(`    ${t}`);

function rodar(comando, opcoes = {}) {
  return execSync(comando, {
    cwd: opcoes.cwd ?? raiz,
    stdio: opcoes.silencioso ? "pipe" : "inherit",
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: BANCO },
  });
}

function tenta(comando) {
  try {
    return rodar(comando, { silencioso: true }).trim();
  } catch {
    return null;
  }
}

function morrer(mensagem, comoResolver) {
  console.error(`\n  ERRO: ${mensagem}`);
  if (comoResolver) console.error(`  ${comoResolver}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------

console.log("\nPreparando o ambiente de demonstracao do ZapCentral\n" + "=".repeat(52));

titulo("Conferindo o que precisa estar instalado");

if (tenta("docker --version") === null) {
  morrer(
    "Docker nao encontrado.",
    "Instale o Docker Desktop e deixe ele ABERTO antes de rodar de novo.",
  );
}
if (tenta("docker ps") === null) {
  morrer(
    "O Docker esta instalado mas nao esta rodando.",
    "Abra o Docker Desktop, espere ficar verde, e rode de novo.",
  );
}
ok("Docker: ok");

if (tenta("pnpm --version") === null) {
  console.log("    pnpm nao encontrado — instalando...");
  rodar("npm install -g pnpm");
}
ok(`pnpm: ${tenta("pnpm --version")}`);

// ---------------------------------------------------------------------------

titulo("Arquivo .env");

if (existsSync(env)) {
  ok(".env ja existe — mantido como esta");
} else {
  const segredo = (n) => randomBytes(n).toString("hex");
  writeFileSync(
    env,
    `# Gerado por scripts/preparar-demo.mjs — nao commitar.
DATABASE_URL=${BANCO}

PORT=8080
APP_PORT=5173
BASE_PATH=/
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173

# A Evolution roda em Docker e alcanca esta maquina por host.docker.internal.
# E por isso que o WhatsApp funciona sem ngrok.
PUBLIC_URL=http://host.docker.internal:8080

# Sem Clerk: o painel entra pedindo so e-mail e nome, sem senha.
# A API se recusa a subir com isto ligado e NODE_ENV=production.
DEV_AUTH_BYPASS=1
VITE_DEV_AUTH_BYPASS=1

# Nao usados enquanto DEV_AUTH_BYPASS=1 estiver ligado.
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
VITE_CLERK_PUBLISHABLE_KEY=
VITE_CLERK_PROXY_URL=

BOOTSTRAP_SECRET=${segredo(24)}

EVOLUTION_API_URL=http://localhost:8081
EVOLUTION_API_KEY=${segredo(24)}
EVOLUTION_DB_PASSWORD=${segredo(12)}
`,
    "utf8",
  );
  ok(".env criado, com segredos novos gerados nesta maquina");
}

// ---------------------------------------------------------------------------

titulo("Banco de dados (Docker, porta 5433)");

const existe = tenta(
  `docker ps -a --filter name=^/${CONTAINER}$ --format "{{.Names}}"`,
);
if (existe === CONTAINER) {
  rodar(`docker start ${CONTAINER}`, { silencioso: true });
  ok("container ja existia — iniciado");
} else {
  rodar(
    `docker run -d --name ${CONTAINER} ` +
      "-e POSTGRES_PASSWORD=zapcentral -e POSTGRES_USER=zapcentral " +
      "-e POSTGRES_DB=zapcentral -p 5433:5432 postgres:16",
    { silencioso: true },
  );
  ok("container criado");
}

process.stdout.write("    esperando o banco aceitar conexao");
let pronto = false;
for (let i = 0; i < 40; i++) {
  if (tenta(`docker exec ${CONTAINER} pg_isready -U zapcentral`)?.includes("accepting")) {
    pronto = true;
    break;
  }
  process.stdout.write(".");
  spawnSync(process.execPath, ["-e", "setTimeout(()=>{},1000)"]);
}
console.log(pronto ? " pronto" : "");
if (!pronto) morrer("O banco nao respondeu a tempo.", "Rode o script de novo.");

// ---------------------------------------------------------------------------

titulo("Dependencias do projeto");
rodar("pnpm install");

titulo("Migrations");
rodar("pnpm --config.verify-deps-before-run=false --filter @workspace/db run migrate");

titulo("Evolution API (WhatsApp, Docker, porta 8081)");
rodar("docker compose -f docker-compose.evolution.yml up -d", { silencioso: true });
ok("subindo — leva ~30s para responder na primeira vez");

titulo("Compilando a API");
rodar("node build.mjs", { cwd: path.join(raiz, "artifacts", "api-server") });

// ---------------------------------------------------------------------------

console.log("\n" + "=".repeat(52));
console.log(`
Ambiente pronto. Agora abra DOIS terminais nesta pasta:

  Terminal 1 — API
    node --enable-source-maps --env-file-if-exists=.env artifacts/api-server/dist/index.mjs

  Terminal 2 — painel
    pnpm --filter @workspace/app run dev

Com a API no ar, popule os dados de demonstracao (terminal 3, uma vez so):

    pnpm --filter @workspace/db run seed:demo

Depois abra  http://localhost:5173  e entre com:

    e-mail: marcelo@hospital.local
    nome:   Marcelo Kalichsztein

(nao pede senha — o ambiente roda sem Clerk)

Para conectar o WhatsApp: menu WhatsApp na lateral, escaneie o QR com o
celular. O numero pareado vira o numero da central.
`);

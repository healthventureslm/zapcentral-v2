/**
 * Sobe o ZapCentral inteiro com um comando.
 *
 *   node scripts/subir-tudo.mjs
 *
 * O que ele faz, em ordem: confere o ambiente, cria ou conserta o `.env`, sobe o
 * Postgres e a Evolution API em Docker, aplica as migrations, compila a API e o
 * painel, popula os dados de demonstracao e sobe UM processo que serve tudo —
 * painel, API, Socket.io e os webhooks do WhatsApp e do Telegram — na porta 8080.
 *
 * Rodar de novo e seguro. O que ja existe e reaproveitado, e nada com valor
 * dentro (senha, chave, token) e sobrescrito.
 *
 * Por que um processo so: antes eram tres (API, Vite, e o painel publicado no
 * Vercel com o endereco da API compilado dentro do build). Cada reinicio da API
 * quebrava o WebSocket do painel, e cada troca de endereco exigia deploy novo.
 * Com `SERVE_APP=1` existe uma porta, uma URL, e nada precisa saber o endereco de
 * nada.
 *
 * Opcoes:
 *   --so-preparar   prepara tudo e nao sobe o servidor
 *   --sem-seed      nao popula os dados de demonstracao
 */
import { execSync, spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arquivoEnv = path.join(raiz, ".env");

const BANCO = "postgresql://zapcentral:zapcentral@localhost:5433/zapcentral";
const CONTAINER_BANCO = "zapcentral-pg";
const COMPOSE_EVOLUTION = "docker-compose.evolution.yml";
const EVOLUTION_URL = "http://localhost:8081";
const PORTA = "8080";

const soPreparar = process.argv.includes("--so-preparar");
const semSeed = process.argv.includes("--sem-seed");

let passo = 0;
const titulo = (t) => console.log(`\n[${++passo}] ${t}`);
const ok = (t) => console.log(`    ${t}`);
const aviso = (t) => console.log(`    AVISO: ${t}`);

function rodar(comando, opcoes = {}) {
  return execSync(comando, {
    cwd: opcoes.cwd ?? raiz,
    stdio: opcoes.silencioso ? "pipe" : "inherit",
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: BANCO, ...(opcoes.env ?? {}) },
  });
}

function tenta(comando, opcoes = {}) {
  try {
    return rodar(comando, { ...opcoes, silencioso: true })?.trim() ?? "";
  } catch (err) {
    // A saida do comando que falhou interessa: e nela que esta o motivo.
    return err?.stdout?.toString() ?? null;
  }
}

function morrer(mensagem, comoResolver) {
  console.error(`\n  ERRO: ${mensagem}`);
  if (comoResolver) console.error(`  ${comoResolver}\n`);
  process.exit(1);
}

/** Espera sem depender de `sleep`, que nao existe igual nos dois shells. */
function esperar(ms) {
  spawnSync(process.execPath, ["-e", `setTimeout(()=>{},${ms})`]);
}

/** Um segredo novo, gerado nesta maquina. Nunca vem de arquivo commitado. */
const segredo = (n) => randomBytes(n).toString("hex");

// ---------------------------------------------------------------------------

console.log(
  "\nZapCentral — subindo o ambiente completo\n" + "=".repeat(46),
);

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
// O .env.
//
// Duas situacoes bem diferentes: arquivo inexistente (cria do zero) e arquivo
// que ja existe (so acrescenta o que falta). O segundo caso e o que mais
// aparece na pratica — e ja custou uma demonstracao: alguem tinha esvaziado
// `EVOLUTION_API_URL` para testar sem WhatsApp e o valor ficou vazio, entao a
// tela do WhatsApp dizia "Evolution API nao configurada" sem nenhuma pista.
// ---------------------------------------------------------------------------

titulo("Arquivo .env");

/** As chaves que o ambiente de demonstracao exige, com o valor certo. */
const OBRIGATORIAS = {
  DATABASE_URL: BANCO,
  PORT: PORTA,
  BASE_PATH: "/",
  NODE_ENV: "development",
  ALLOWED_ORIGINS: `http://localhost:${PORTA},http://localhost:5173`,
  // A Evolution roda em Docker e alcanca esta maquina por host.docker.internal.
  // E por isso que o WhatsApp funciona sem tunel nenhum.
  PUBLIC_URL: `http://host.docker.internal:${PORTA}`,
  DEV_AUTH_BYPASS: "1",
  VITE_DEV_AUTH_BYPASS: "1",
  // Processo unico: a API serve o painel, e o painel para de procurar o
  // prefixo /api-server. As duas tem que andar juntas.
  SERVE_APP: "1",
  VITE_API_SAME_ORIGIN: "1",
  EVOLUTION_API_URL: EVOLUTION_URL,
};

/** Chaves que sao geradas uma vez e nunca mais tocadas. */
const GERADAS = {
  BOOTSTRAP_SECRET: () => segredo(24),
  EVOLUTION_API_KEY: () => segredo(24),
  EVOLUTION_DB_PASSWORD: () => segredo(12),
};

/** Chaves que existem mas ficam vazias enquanto o bypass estiver ligado. */
const VAZIAS = [
  "APP_PORT",
  "CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "VITE_CLERK_PUBLISHABLE_KEY",
  "VITE_CLERK_PROXY_URL",
];

function lerEnv() {
  if (!existsSync(arquivoEnv)) return { linhas: [], valores: {} };
  const linhas = readFileSync(arquivoEnv, "utf8").split(/\r?\n/);
  const valores = {};
  for (const l of linhas) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(l.trim());
    if (m) valores[m[1]] = m[2];
  }
  return { linhas, valores };
}

const { valores: antes } = lerEnv();
const novoEnv = { ...antes };
const mudancas = [];

for (const [chave, valor] of Object.entries(OBRIGATORIAS)) {
  if (!novoEnv[chave] || novoEnv[chave].trim() === "") {
    novoEnv[chave] = valor;
    mudancas.push(`${chave} definido`);
  }
}
for (const [chave, gerar] of Object.entries(GERADAS)) {
  if (!novoEnv[chave] || novoEnv[chave].trim() === "") {
    novoEnv[chave] = gerar();
    mudancas.push(`${chave} gerado`);
  }
}
for (const chave of VAZIAS) {
  if (novoEnv[chave] === undefined) novoEnv[chave] = "";
}

// ALLOWED_ORIGINS e a unica chave em que ACRESCENTAR e mais certo que manter:
// um arquivo antigo lista so a porta do Vite, e sem a porta 8080 na lista o
// painel servido pela API perde o tempo real sem dar erro na tela.
{
  const atuais = (novoEnv["ALLOWED_ORIGINS"] ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const precisa = `http://localhost:${PORTA}`;
  if (!atuais.includes(precisa)) {
    atuais.unshift(precisa);
    novoEnv["ALLOWED_ORIGINS"] = atuais.join(",");
    mudancas.push(`ALLOWED_ORIGINS agora inclui ${precisa}`);
  }
}

// APP_PORT vazia de proposito: com o painel servido pela propria API, o dev
// server do Vite nao entra no caminho. Ela existe no arquivo para quem quiser
// voltar ao modo de desenvolvimento com recarga automatica.
novoEnv["APP_PORT"] = "";

const ordem = [
  "DATABASE_URL",
  "PORT",
  "APP_PORT",
  "BASE_PATH",
  "NODE_ENV",
  "ALLOWED_ORIGINS",
  "PUBLIC_URL",
  "SERVE_APP",
  "VITE_API_SAME_ORIGIN",
  "DEV_AUTH_BYPASS",
  "VITE_DEV_AUTH_BYPASS",
  "CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "VITE_CLERK_PUBLISHABLE_KEY",
  "VITE_CLERK_PROXY_URL",
  "BOOTSTRAP_SECRET",
  "EVOLUTION_API_URL",
  "EVOLUTION_API_KEY",
  "EVOLUTION_DB_PASSWORD",
];

const corpo = [
  "# Gerado por scripts/subir-tudo.mjs — nao commitar.",
  "# Ambiente de demonstracao: sem Clerk, sem tunel, tudo local.",
  "",
  ...ordem.map((k) => `${k}=${novoEnv[k] ?? ""}`),
  // Qualquer chave que alguem tenha acrescentado a mao sobrevive.
  ...Object.keys(novoEnv)
    .filter((k) => !ordem.includes(k))
    .map((k) => `${k}=${novoEnv[k]}`),
  "",
].join("\n");

writeFileSync(arquivoEnv, corpo, "utf8");

if (mudancas.length === 0) ok(".env conferido — nada faltando");
else mudancas.forEach((m) => ok(m));

// A partir daqui o processo enxerga o mesmo ambiente do arquivo.
for (const [k, v] of Object.entries(novoEnv)) if (v) process.env[k] = v;

// ---------------------------------------------------------------------------

titulo("Banco de dados (Docker, porta 5433)");

const existeBanco = tenta(
  `docker ps -a --filter name=^/${CONTAINER_BANCO}$ --format "{{.Names}}"`,
);
if (existeBanco === CONTAINER_BANCO) {
  tenta(`docker start ${CONTAINER_BANCO}`);
  ok("container ja existia — iniciado");
} else {
  rodar(
    `docker run -d --name ${CONTAINER_BANCO} ` +
      "-e POSTGRES_PASSWORD=zapcentral -e POSTGRES_USER=zapcentral " +
      "-e POSTGRES_DB=zapcentral -p 5433:5432 postgres:16",
    { silencioso: true },
  );
  ok("container criado");
}

process.stdout.write("    esperando o banco aceitar conexao");
let bancoPronto = false;
for (let i = 0; i < 40; i++) {
  if (
    tenta(`docker exec ${CONTAINER_BANCO} pg_isready -U zapcentral`)?.includes(
      "accepting",
    )
  ) {
    bancoPronto = true;
    break;
  }
  process.stdout.write(".");
  esperar(1000);
}
console.log(bancoPronto ? " pronto" : "");
if (!bancoPronto) morrer("O banco nao respondeu a tempo.", "Rode de novo.");

// ---------------------------------------------------------------------------

titulo("Dependencias do projeto");
rodar("pnpm install --config.verify-deps-before-run=false");

titulo("Migrations");
rodar(
  "pnpm --config.verify-deps-before-run=false --filter @workspace/db run migrate",
);

// ---------------------------------------------------------------------------
// Evolution API.
//
// A armadilha: a senha do Postgres da Evolution so vale na PRIMEIRA criacao do
// volume. Se o `.env` for regenerado com senha nova enquanto o volume antigo
// continua no disco, a Evolution entra em laco de reinicio com
// "P1000: Authentication failed" — e o sintoma que chega no painel e um lacônico
// "Evolution API nao configurada", sem nenhuma mencao a banco ou senha.
//
// Por isso aqui nao basta subir: e preciso conferir que ela RESPONDE, e, se o
// motivo da falha for esse, recriar o volume dela — que nao guarda nada alem do
// que a propria Evolution regenera.
// ---------------------------------------------------------------------------

titulo("Evolution API — o gateway do WhatsApp (Docker, porta 8081)");

function evolutionResponde() {
  const r = spawnSync(
    process.execPath,
    [
      "-e",
      `fetch("${EVOLUTION_URL}").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`,
    ],
    { timeout: 10_000 },
  );
  return r.status === 0;
}

function subirEvolution() {
  rodar(`docker compose -f ${COMPOSE_EVOLUTION} up -d`, { silencioso: true });
}

function esperarEvolution(segundos) {
  process.stdout.write("    esperando a Evolution responder");
  for (let i = 0; i < segundos; i++) {
    if (evolutionResponde()) {
      console.log(" pronta");
      return true;
    }
    process.stdout.write(".");
    esperar(1000);
  }
  console.log("");
  return false;
}

subirEvolution();

if (!esperarEvolution(60)) {
  const log = tenta(
    "docker compose -f " + COMPOSE_EVOLUTION + " logs --tail 40 evolution",
  );
  const senhaErrada = (log ?? "").includes("P1000");

  if (senhaErrada) {
    aviso(
      "o volume do Postgres da Evolution foi criado com outra senha — recriando",
    );
    rodar(`docker compose -f ${COMPOSE_EVOLUTION} down`, { silencioso: true });
    // Apenas os volumes da Evolution. O banco do ZapCentral e outro container.
    tenta(
      "docker volume rm zapcentral-evolution_evolution_pgdata " +
        "zapcentral-evolution_evolution_redis",
    );
    subirEvolution();
    if (!esperarEvolution(90)) {
      aviso(
        "a Evolution ainda nao respondeu. O resto do ambiente funciona; " +
          "so o WhatsApp real fica indisponivel. Use o Simulador.",
      );
    }
  } else {
    aviso(
      "a Evolution nao respondeu em 60s. O resto do ambiente funciona; " +
        "so o WhatsApp real fica indisponivel. Use o Simulador.",
    );
  }
}

// ---------------------------------------------------------------------------

titulo("Compilando a API");
rodar("node build.mjs", { cwd: path.join(raiz, "artifacts", "api-server") });

titulo("Compilando o painel");
// As variaveis vao pelo ambiente do processo, e nao por prefixo de shell, de
// proposito: no Git Bash do Windows um `BASE_PATH=/` na linha de comando e
// reescrito para `/Program Files/Git/` pela traducao de caminhos do MSYS, e o
// build sai com os caminhos dos assets quebrados. Levou meia hora para
// descobrir; nao repetir.
rodar(
  "pnpm --config.verify-deps-before-run=false --filter @workspace/app run build",
  {
    env: {
      BASE_PATH: "/",
      VITE_API_SAME_ORIGIN: "1",
      VITE_DEV_AUTH_BYPASS: "1",
      NODE_ENV: "production",
    },
  },
);

if (!semSeed) {
  titulo("Dados de demonstracao");
  rodar(
    "pnpm --config.verify-deps-before-run=false --filter @workspace/db run seed:demo",
  );
}

// ---------------------------------------------------------------------------

console.log("\n" + "=".repeat(46));

if (soPreparar) {
  console.log(`
Tudo preparado. Para subir o servidor:

    node --enable-source-maps --env-file-if-exists=.env artifacts/api-server/dist/index.mjs

Depois abra  http://localhost:${PORTA}
`);
  process.exit(0);
}

console.log(`
Ambiente pronto. Subindo o servidor — deixe este terminal aberto.

    Painel:     http://localhost:${PORTA}
    WhatsApp:   http://localhost:${PORTA}/whatsapp    (escaneie o QR)
    Simulador:  http://localhost:${PORTA}/simulador   (demonstra sem celular)

Entre clicando em "Marcelo Kalichsztein" — nao pede senha.
Para parar: Ctrl+C.
`);

const servidor = spawn(
  process.execPath,
  [
    "--enable-source-maps",
    "--env-file-if-exists=.env",
    path.join("artifacts", "api-server", "dist", "index.mjs"),
  ],
  { cwd: raiz, stdio: "inherit", env: process.env },
);

servidor.on("exit", (codigo) => process.exit(codigo ?? 0));
process.on("SIGINT", () => servidor.kill("SIGINT"));

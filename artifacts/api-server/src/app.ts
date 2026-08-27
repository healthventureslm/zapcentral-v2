import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { isDevAuthBypass } from "./lib/devAuth";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ---------------------------------------------------------------------------
// CORS — only allow explicitly listed trusted origins.
// In production set ALLOWED_ORIGINS as a comma-separated list of the exact
// origins that serve the frontend (e.g. https://zapcentral.example.com).
// In development the Replit dev domain is auto-added so the Vite app works.
// ---------------------------------------------------------------------------
/**
 * A origem publica em que este servidor responde, quando ele mesmo serve o
 * painel.
 *
 * Sem isto, publicar o processo unico numa URL exigiria repetir essa URL em
 * `ALLOWED_ORIGINS` — e esquecer disso nao da erro visivel: o painel abre, as
 * telas carregam por HTTP, e so o tempo real morre em silencio, porque o
 * Socket.io recusa a origem. `PUBLIC_URL` ja e obrigatoria para o webhook do
 * Telegram, entao aproveitamos a mesma variavel em vez de criar a segunda.
 */
function origemPublica(): string | null {
  const bruta = process.env["PUBLIC_URL"];
  if (!bruta) return null;
  try {
    return new URL(bruta).origin;
  } catch {
    return null;
  }
}

const trustedOrigins = new Set<string>();

(process.env["ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)
  .forEach((o) => trustedOrigins.add(o));

// A origem que serve este painel, quando o proprio servidor o serve.
if (process.env["SERVE_APP"] === "1") {
  const propria = origemPublica();
  if (propria) trustedOrigins.add(propria);
}

// Replit dev domain — safe to add only in development
if (
  process.env["NODE_ENV"] !== "production" &&
  process.env["REPLIT_DEV_DOMAIN"]
) {
  trustedOrigins.add(`https://${process.env["REPLIT_DEV_DOMAIN"]}`);
}

const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    // Requests with no Origin header (server-to-server, curl) are always allowed
    if (!origin) {
      callback(null, true);
      return;
    }
    if (trustedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    // In development also allow localhost on any port
    if (
      process.env["NODE_ENV"] !== "production" &&
      /^https?:\/\/localhost(:\d+)?$/.test(origin)
    ) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
};

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Clerk proxy must come before body parsers (streams raw bytes)
if (!isDevAuthBypass) {
  app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Resolve publishable key from request host (supports multiple custom domains).
// No bypass de desenvolvimento o middleware do Clerk fica de fora inteiro — com
// chave invalida ele lanca em toda requisicao, inclusive no health check.
if (!isDevAuthBypass) {
  app.use(
    clerkMiddleware((req) => ({
      publishableKey: publishableKeyFromHost(
        getClerkProxyHost(req) ?? "",
        process.env["CLERK_PUBLISHABLE_KEY"],
      ),
    })),
  );
}

app.use("/api", router);

// ---------------------------------------------------------------------------
// Processo unico: a API serve o painel compilado.
//
// Por que existe: sem isto, colocar o produto no ar exige duas implantacoes
// (painel no Vercel, API num processo persistente) mais uma variavel com o
// endereco da API compilada DENTRO do build do painel. Consequencia pratica:
// toda vez que o endereco da API muda — e com tunel gratuito ele muda a cada
// reinicio — o painel publicado quebra e so volta com um deploy novo.
//
// Com `SERVE_APP=1` o painel, a API, o Socket.io e os dois webhooks respondem na
// MESMA origem. Sobe um processo, publica uma URL, e nada precisa saber o
// endereco de nada. O painel tem que ter sido compilado com
// `VITE_API_SAME_ORIGIN=1`, que e o que o desliga de procurar o prefixo
// `/api-server`.
//
// Fica atras de uma variavel, e nao ligado sempre, porque o modo Replit e o modo
// Vercel continuam validos e nao devem mudar de comportamento.
// ---------------------------------------------------------------------------
if (process.env["SERVE_APP"] === "1") {
  const { existsSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const aqui = dirname(fileURLToPath(import.meta.url));

  // O build compila tudo num arquivo so em `artifacts/api-server/dist/`, entao
  // subir tres niveis chega na raiz do repositorio. Em `tsx` (sem build) o
  // arquivo esta em `src/`, um nivel mais fundo — daí as duas tentativas.
  const candidatos = [
    join(aqui, "..", "..", "..", "artifacts", "app", "dist", "public"),
    join(aqui, "..", "..", "..", "..", "artifacts", "app", "dist", "public"),
  ];
  const painel = candidatos.find((c) => existsSync(join(c, "index.html")));

  if (!painel) {
    logger.error(
      { candidatos },
      "SERVE_APP=1 mas o painel compilado nao foi encontrado. " +
        "Rode: pnpm --filter @workspace/app run build",
    );
  } else {
    logger.info({ painel }, "Servindo o painel compilado");

    // Os arquivos com hash no nome podem ser cacheados para sempre; o
    // index.html, nunca — e ele que aponta para os hashes novos depois de um
    // deploy, e um index cacheado deixa o navegador pedindo arquivo que nao
    // existe mais.
    app.use(
      express.static(painel, {
        index: false,
        setHeaders(res, caminho) {
          if (caminho.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-store");
          }
        },
      }),
    );

    // Qualquer rota que nao seja da API cai no index.html: o roteamento e do
    // lado do navegador, e sem isto abrir /simulador direto na barra de
    // endereco devolveria 404.
    app.get(/^(?!\/api\/|\/socket\.io\/).*/, (_req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.sendFile(join(painel, "index.html"));
    });
  }
}

export default app;

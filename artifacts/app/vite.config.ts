import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

// Carrega o .env da raiz para desenvolvimento local. No Replit e no Vercel nao
// existe arquivo .env — os valores chegam por process.env, que tem precedencia.
const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const env = {
  ...loadEnv(process.env.NODE_ENV ?? 'development', repoRoot, ''),
  ...process.env,
};

// APP_PORT e a porta do dev server do Vite, definida apenas em ambiente local.
// No Replit ela nao existe e PORT e usada, exatamente como antes.
const rawPort = env.APP_PORT || env.PORT;

const basePath = env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

// Apenas em desenvolvimento local: encaminha o prefixo /api-server para a API.
// No Replit esse prefixo e roteado pela plataforma, entao o proxy fica
// desativado la (APP_PORT nao existe) e nada muda.
const apiTargetPort = env.APP_PORT ? Number(env.PORT ?? 8080) : null;

const proxy = apiTargetPort
  ? {
      '/api-server': {
        target: `http://127.0.0.1:${apiTargetPort}`,
        changeOrigin: true,
        ws: true,
        rewrite: (p: string) => p.replace(/^\/api-server/, ''),
      },
    }
  : undefined;

export default defineConfig(async ({ command }) => {
  // A porta so e necessaria para servir (dev/preview). Em `vite build` — o caso
  // do Vercel — nao ha servidor, e exigi-la faria o build falhar sem motivo.
  const isServing = command === 'serve';
  const port = Number(rawPort);

  if (isServing) {
    if (!rawPort) {
      throw new Error(
        'PORT environment variable is required but was not provided.',
      );
    }
    if (Number.isNaN(port) || port <= 0) {
      throw new Error(`Invalid PORT value: "${rawPort}"`);
    }
  }

  const serverOptions = rawPort && !Number.isNaN(port) ? { port } : {};

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss({ optimize: false }),
      runtimeErrorOverlay(),
      ...(process.env.NODE_ENV !== 'production' &&
      process.env.REPL_ID !== undefined
        ? [
            await import('@replit/vite-plugin-cartographer').then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, '..'),
              }),
            ),
            await import('@replit/vite-plugin-dev-banner').then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
        '@assets': path.resolve(
          import.meta.dirname,
          '..',
          '..',
          'attached_assets',
        ),
      },
      dedupe: ['react', 'react-dom'],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, 'dist/public'),
      emptyOutDir: true,
    },
    server: {
      ...serverOptions,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true,
      ...(proxy ? { proxy } : {}),
      fs: {
        strict: true,
      },
    },
    preview: {
      ...serverOptions,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});

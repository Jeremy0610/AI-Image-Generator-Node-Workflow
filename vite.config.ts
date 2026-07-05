import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const MAX_LOCAL_API_BODY_LENGTH = 5_000_000;

async function readBody(request: IncomingMessage): Promise<string> {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > MAX_LOCAL_API_BODY_LENGTH) throw new Error('REQUEST_TOO_LARGE');
  }
  return body;
}

function localGeminiApi(): Plugin {
  return {
    name: 'local-gemini-api',
    configureServer(server) {
      server.middlewares.use('/api/gemini', async (request, response) => {
        const apiResponse = {
          status(code: number) {
            response.statusCode = code;
            return apiResponse;
          },
          json(body: unknown) {
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify(body));
          },
          setHeader(name: string, value: string) {
            response.setHeader(name, value);
          },
        };

        try {
          const { default: geminiHandler } = await server.ssrLoadModule('/api/gemini.ts') as typeof import('./api/gemini');
          await geminiHandler({
            method: request.method,
            headers: request.headers,
            body: await readBody(request),
          }, apiResponse);
        } catch (error) {
          if (error instanceof Error && error.message === 'REQUEST_TOO_LARGE') {
            apiResponse.status(413).json({ error: 'Request payload is too large.' });
            return;
          }
          console.error(error);
          apiResponse.status(500).json({ error: 'Local API proxy failed.' });
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), localGeminiApi()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

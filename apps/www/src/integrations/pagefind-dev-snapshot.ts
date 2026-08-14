import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

const pagefindPathPrefix = '/pagefind/';
const snapshotDirectory = resolve(
  fileURLToPath(new URL('../../../../.cache/pagefind/', import.meta.url)),
);
const snapshotEntrypoint = resolve(snapshotDirectory, 'pagefind.js');
const contentTypes: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
};

export const pagefindDevSnapshot = (): AstroIntegration => {
  const snapshotAvailable = existsSync(snapshotEntrypoint);

  return {
    name: 'pagefind-dev-snapshot',
    hooks: {
      'astro:config:setup': ({ command, updateConfig }) => {
        updateConfig({
          vite: {
            define: {
              'import.meta.env.PAGEFIND_DEV_SNAPSHOT_AVAILABLE': JSON.stringify(
                command === 'dev' && snapshotAvailable,
              ),
            },
          },
        });
      },
      'astro:server:setup': ({ server }) => {
        if (!snapshotAvailable) {
          return;
        }

        server.middlewares.use((request, response, next) => {
          const requestUrl = request.url;
          if (!requestUrl) {
            return next();
          }

          let pathname: string;
          try {
            pathname = decodeURIComponent(
              new URL(requestUrl, 'http://localhost').pathname,
            );
          } catch {
            return next();
          }

          if (!pathname.startsWith(pagefindPathPrefix)) {
            return next();
          }

          const filePath = resolve(
            snapshotDirectory,
            pathname.slice(pagefindPathPrefix.length),
          );
          if (!filePath.startsWith(`${snapshotDirectory}${sep}`)) {
            return next();
          }

          void readFile(filePath)
            .then((contents) => {
              response.statusCode = 200;
              response.setHeader('Cache-Control', 'no-store');
              response.setHeader(
                'Content-Type',
                contentTypes[extname(filePath)] ?? 'application/octet-stream',
              );
              response.end(contents);
            })
            .catch(() => next());
        });
      },
    },
  };
};

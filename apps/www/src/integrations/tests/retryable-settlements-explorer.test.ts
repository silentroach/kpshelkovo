import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';

import { createRetryableExplorerDevPlugin } from '../retryable-settlements-explorer';

const graphPath = '/__settlements-explorer/graph.js';
const hmrFile = join(
  fileURLToPath(new URL('../../', import.meta.url)),
  `retryable-explorer-hmr-${String(process.pid)}.ts`,
);
let server: ViteDevServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
  await rm(hmrFile, { force: true });
});

describe('retryable settlements explorer dev plugin', () => {
  it('caches the graph across query URLs and rebuilds after source changes', async () => {
    let buildCount = 0;
    const buildGraph = async (): Promise<string> => {
      buildCount += 1;
      return `export const build = ${String(buildCount)};`;
    };
    const viteServer = await createServer({
      appType: 'custom',
      clearScreen: false,
      configFile: false,
      logLevel: 'silent',
      plugins: [createRetryableExplorerDevPlugin(buildGraph)],
      server: {
        hmr: false,
        host: '127.0.0.1',
        port: 0,
        strictPort: true,
      },
    });
    server = viteServer;
    await viteServer.listen();

    const address = viteServer.httpServer?.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected Vite test server to listen on a TCP port');
    }
    const origin = `http://127.0.0.1:${String(address.port)}`;
    const initialResponse = await fetch(`${origin}${graphPath}`);
    const initialSource = await initialResponse.text();
    const retryResponse = await fetch(`${origin}${graphPath}?explorer-retry=2`);
    const retrySource = await retryResponse.text();
    const hmrEvent = new Promise<void>((resolve) => {
      const onAdd = (file: string): void => {
        if (file !== hmrFile) return;

        viteServer.watcher.off('add', onAdd);
        resolve();
      };
      viteServer.watcher.on('add', onAdd);
    });
    await writeFile(hmrFile, 'export {};');
    await hmrEvent;
    const updatedResponse = await fetch(
      `${origin}${graphPath}?explorer-retry=3`,
    );
    const updatedSource = await updatedResponse.text();

    expect({
      initialStatus: initialResponse.status,
      retryStatus: retryResponse.status,
      contentType: retryResponse.headers.get('content-type'),
      sameSource: retrySource === initialSource,
      initialSource,
      updatedSource,
      buildCalls: buildCount,
    }).toMatchInlineSnapshot(`
      {
        "buildCalls": 2,
        "contentType": "text/javascript; charset=utf-8",
        "initialSource": "export const build = 1;",
        "initialStatus": 200,
        "retryStatus": 200,
        "sameSource": true,
        "updatedSource": "export const build = 2;",
      }
    `);
  });
});

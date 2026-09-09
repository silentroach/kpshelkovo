import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { resolveConfig } from 'vite';
import type { Connect, FSWatcher, ViteDevServer } from 'vite';
import { expect, it } from 'vitest';

import { PAGEFIND_DEV_SNAPSHOT_AVAILABLE_DEFINE } from '../pagefind-dev-snapshot';
import { createRetryableSearchDialogDevPlugin } from '../retryable-search-dialog';

const graphPath = '/__search-dialog/graph.js';

const loadDevGraph = async (snapshotAvailable: boolean) => {
  let graphEnvironment: unknown;
  const plugin = createRetryableSearchDialogDevPlugin(async (environment) => {
    graphEnvironment = environment;
    return `export const snapshotAvailable = ${environment.pagefindDevSnapshotAvailable};`;
  });
  const configResolved = plugin.configResolved;
  if (typeof configResolved !== 'function') {
    throw new Error('Expected search plugin to receive resolved Vite config');
  }
  const config = await resolveConfig(
    {
      configFile: false,
      define: {
        [PAGEFIND_DEV_SNAPSHOT_AVAILABLE_DEFINE]: JSON.stringify(snapshotAvailable)
      },
      mode: 'development'
    },
    'serve'
  );
  await (configResolved as OmitThisParameter<typeof configResolved>)(config);

  let middleware: Connect.NextHandleFunction | undefined;
  const middlewares = {
    use(handler: Connect.NextHandleFunction) {
      middleware = handler;
      return middlewares;
    }
  } as Connect.Server;
  const configureServer = plugin.configureServer;
  if (typeof configureServer !== 'function') {
    throw new Error('Expected search plugin to configure the Vite server');
  }
  await (configureServer as OmitThisParameter<typeof configureServer>)({
    watcher: new EventEmitter() as FSWatcher,
    middlewares
  } as ViteDevServer);
  if (!middleware) {
    throw new Error('Expected search plugin to register middleware');
  }

  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const response = {
    statusCode: 0,
    setHeader(name, value) {
      void name;
      void value;
      return response;
    },
    end(body) {
      resolve(String(body));
      return response;
    }
  } as ServerResponse;
  middleware({ url: graphPath } as IncomingMessage, response, (error?: unknown) =>
    reject(error ?? new Error('Graph middleware did not handle the request'))
  );

  return { graphEnvironment, source: await promise };
};

it('builds the dev graph with Pagefind unavailable without a snapshot', async () => {
  expect(await loadDevGraph(false)).toMatchInlineSnapshot(`
    {
      "graphEnvironment": {
        "command": "serve",
        "mode": "development",
        "pagefindDevSnapshotAvailable": "false",
      },
      "source": "export const snapshotAvailable = false;",
    }
  `);
});

it('builds the dev graph with Pagefind available from a snapshot', async () => {
  expect(await loadDevGraph(true)).toMatchInlineSnapshot(`
    {
      "graphEnvironment": {
        "command": "serve",
        "mode": "development",
        "pagefindDevSnapshotAvailable": "true",
      },
      "source": "export const snapshotAvailable = true;",
    }
  `);
});

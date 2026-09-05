import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import type { Connect, FSWatcher, ViteDevServer } from 'vite';

import { createRetryableExplorerDevPlugin } from '../retryable-settlements-explorer';

const graphPath = '/__settlements-explorer/graph.js';
const sourceFile = fileURLToPath(import.meta.url);

const requestGraph = async (
  middleware: Connect.NextHandleFunction,
  url: string,
) => {
  let contentType: string | undefined;
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const response = {
    statusCode: 0,
    setHeader(name, value) {
      if (name.toLowerCase() === 'content-type') {
        contentType = String(value);
      }
      return response;
    },
    end(body) {
      resolve(String(body));
      return response;
    },
  } as ServerResponse;
  middleware({ url } as IncomingMessage, response, (error?: unknown) => {
    reject(error ?? new Error('Graph middleware did not handle the request'));
  });
  const source = await promise;

  return { status: response.statusCode, contentType, source };
};

describe('retryable settlements explorer dev plugin', () => {
  it('caches the graph across query URLs and rebuilds after source changes', async () => {
    let buildCount = 0;
    const buildGraph = async (): Promise<string> => {
      buildCount += 1;
      return `export const build = ${String(buildCount)};`;
    };
    let middleware: Connect.NextHandleFunction | undefined;
    const watcher = new EventEmitter() as FSWatcher;
    const middlewares = {
      use(handler: Connect.NextHandleFunction) {
        middleware = handler;
        return middlewares;
      },
    } as Connect.Server;
    const plugin = createRetryableExplorerDevPlugin(buildGraph);
    const configureServer = plugin.configureServer;
    if (typeof configureServer !== 'function') {
      throw new Error('Expected explorer plugin to configure the Vite server');
    }
    await (configureServer as OmitThisParameter<typeof configureServer>)({
      watcher,
      middlewares,
    } as ViteDevServer);
    if (!middleware) {
      throw new Error('Expected explorer plugin to register middleware');
    }

    const initialResponse = await requestGraph(middleware, graphPath);
    const retryResponse = await requestGraph(
      middleware,
      `${graphPath}?explorer-retry=2`,
    );
    watcher.emit('all', 'change', sourceFile);
    const updatedResponse = await requestGraph(
      middleware,
      `${graphPath}?explorer-retry=3`,
    );

    expect({
      initialStatus: initialResponse.status,
      retryStatus: retryResponse.status,
      contentType: retryResponse.contentType,
      sameSource: retryResponse.source === initialResponse.source,
      initialSource: initialResponse.source,
      updatedSource: updatedResponse.source,
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

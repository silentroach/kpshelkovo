import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { svelte } from '@sveltejs/vite-plugin-svelte';
import { build, type Plugin } from 'vite';

const assetsModuleId = 'virtual:settlements-explorer-assets';
const resolvedAssetsModuleId = `\0${assetsModuleId}`;
const appRoot = fileURLToPath(new URL('../..', import.meta.url));
const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url));
const srcRoot = fileURLToPath(new URL('..', import.meta.url));
const graphEntry = fileURLToPath(
  new URL('../compare/client/explorer-component.ts', import.meta.url),
);
const graphDevUrl = '/__settlements-explorer/graph.js';
const graphSourceRoots = [srcRoot, resolve(workspaceRoot, 'packages')].map(
  (root) => `${resolve(root)}${sep}`,
);

const isGraphSourceFile = (file: string): boolean =>
  graphSourceRoots.some((root) => resolve(file).startsWith(root));

// A failed browser module is cached by URL, so the retryable graph must be self-contained.
const buildExplorerGraph = async (): Promise<string> => {
  const result = await build({
    root: appRoot,
    configFile: false,
    publicDir: false,
    envDir: workspaceRoot,
    envPrefix: 'PUBLIC_',
    logLevel: 'warn',
    plugins: [svelte()],
    resolve: {
      alias: {
        '@': srcRoot,
      },
    },
    build: {
      write: false,
      modulePreload: false,
      minify: 'esbuild',
      lib: {
        entry: graphEntry,
        formats: ['es'],
        fileName: 'module',
      },
      rollupOptions: {
        output: {
          codeSplitting: false,
        },
      },
    },
  });

  const outputs = Array.isArray(result) ? result : [result];
  if (outputs.length !== 1) {
    throw new Error('Expected one standalone explorer graph build output');
  }

  const output = outputs[0];
  if (!output || !('output' in output)) {
    throw new Error('Standalone explorer graph build output is missing');
  }

  const chunks = output.output.filter((item) => item.type === 'chunk');
  if (chunks.length !== 1) {
    throw new Error(
      `Expected one standalone explorer graph chunk, received ${String(chunks.length)}`,
    );
  }

  const chunk = chunks[0];
  if (!chunk) {
    throw new Error('Standalone explorer graph chunk is missing');
  }
  if (chunk.imports.length > 0 || chunk.dynamicImports.length > 0) {
    throw new Error('Standalone explorer graph must be self-contained');
  }

  // Astro emits the same component tree's scoped CSS from the SSR page build.
  return chunk.code;
};

const retryableExplorerBuildPlugin = (): Plugin => {
  let graphReference: string | undefined;

  return {
    name: 'retryable-settlements-explorer-build',
    apply: 'build',
    applyToEnvironment: (environment) => environment.name === 'client',
    buildStart: async function () {
      const graphSource = await buildExplorerGraph();
      graphReference = this.emitFile({
        type: 'asset',
        name: 'SettlementsExplorerClient.js',
        source: graphSource,
      });
    },
    resolveId(id) {
      if (id === assetsModuleId) return resolvedAssetsModuleId;
      return;
    },
    load(id) {
      if (id !== resolvedAssetsModuleId) return;
      if (!graphReference) {
        throw new Error('Settlements explorer graph asset is not ready');
      }
      return `
        export const explorerGraphUrl = import.meta.ROLLUP_FILE_URL_${graphReference};
      `;
    },
  };
};

export const createRetryableExplorerDevPlugin = (
  buildGraph: () => Promise<string> = buildExplorerGraph,
): Plugin => {
  let graphSourceRequest: Promise<string> | undefined;

  const loadGraphSource = (): Promise<string> => {
    graphSourceRequest ??= buildGraph().catch((error) => {
      graphSourceRequest = undefined;
      throw error;
    });

    return graphSourceRequest;
  };

  return {
    name: 'retryable-settlements-explorer-dev',
    apply: 'serve',
    applyToEnvironment: (environment) => environment.name === 'client',
    configureServer(server) {
      server.watcher.on('all', (event, file) => {
        if (
          (event === 'add' || event === 'change' || event === 'unlink') &&
          isGraphSourceFile(file)
        ) {
          graphSourceRequest = undefined;
        }
      });
      server.middlewares.use(async (request, response, next) => {
        if (
          !request.url ||
          new URL(request.url, 'http://vite.local').pathname !== graphDevUrl
        ) {
          next();
          return;
        }

        try {
          response.statusCode = 200;
          response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          response.setHeader('Cache-Control', 'no-cache');
          response.end(await loadGraphSource());
        } catch (error) {
          next(error instanceof Error ? error : new Error(String(error)));
        }
      });
    },
    resolveId(id) {
      if (id === assetsModuleId) return resolvedAssetsModuleId;
      return;
    },
    load(id) {
      if (id !== resolvedAssetsModuleId) return;
      return `
        export const explorerGraphUrl = ${JSON.stringify(graphDevUrl)};
      `;
    },
  };
};

export const retryableSettlementsExplorer = (): readonly Plugin[] => [
  retryableExplorerBuildPlugin(),
  createRetryableExplorerDevPlugin(),
];

import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { svelte } from '@sveltejs/vite-plugin-svelte';
import { build, type Plugin } from 'vite';

import { PAGEFIND_DEV_SNAPSHOT_AVAILABLE_DEFINE } from './pagefind-dev-snapshot';
import type {
  SearchDialogGraphBuilder,
  SearchDialogGraphEnvironment,
  SearchDialogOuterConfig
} from './retryable-search-dialog.types';

const assetsModuleId = 'virtual:search-dialog-assets';
const resolvedAssetsModuleId = `\0${assetsModuleId}`;
const appRoot = fileURLToPath(new URL('../..', import.meta.url));
const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url));
const srcRoot = fileURLToPath(new URL('..', import.meta.url));
const graphEntry = fileURLToPath(new URL('../components/search/lazy.ts', import.meta.url));
const graphDevUrl = '/__search-dialog/graph.js';
const graphSourceRoots = [srcRoot, resolve(workspaceRoot, 'packages')].map(
  (root) => `${resolve(root)}${sep}`
);

const isGraphSourceFile = (file: string): boolean =>
  graphSourceRoots.some((root) => resolve(file).startsWith(root));

const resolveGraphEnvironment = (
  config: SearchDialogOuterConfig
): SearchDialogGraphEnvironment | undefined => {
  const pagefindDevSnapshotAvailable = config.define?.[PAGEFIND_DEV_SNAPSHOT_AVAILABLE_DEFINE];
  if (typeof pagefindDevSnapshotAvailable !== 'string') {
    return;
  }

  return {
    command: config.command,
    mode: config.mode,
    pagefindDevSnapshotAvailable
  };
};

const requireGraphEnvironment = (
  environment?: SearchDialogGraphEnvironment
): SearchDialogGraphEnvironment => {
  if (!environment) {
    throw new Error('Search dialog graph environment is not ready');
  }

  return environment;
};

const buildSearchDialogGraph: SearchDialogGraphBuilder = async (environment): Promise<string> => {
  const result = await build({
    root: appRoot,
    configFile: false,
    publicDir: false,
    envDir: workspaceRoot,
    envPrefix: 'PUBLIC_',
    logLevel: 'warn',
    mode: environment.mode,
    define: {
      'import.meta.env.DEV': JSON.stringify(environment.command === 'serve'),
      [PAGEFIND_DEV_SNAPSHOT_AVAILABLE_DEFINE]: environment.pagefindDevSnapshotAvailable
    },
    plugins: [svelte()],
    resolve: {
      alias: {
        '@': srcRoot
      }
    },
    build: {
      write: false,
      modulePreload: false,
      minify: 'esbuild',
      lib: {
        entry: graphEntry,
        formats: ['es'],
        fileName: 'module'
      },
      rollupOptions: {
        output: {
          codeSplitting: false
        }
      }
    }
  });

  const outputs = Array.isArray(result) ? result : [result];
  if (outputs.length !== 1) {
    throw new Error('Expected one standalone search dialog build output');
  }

  const output = outputs[0];
  if (!output || !('output' in output)) {
    throw new Error('Standalone search dialog build output is missing');
  }

  const chunks = output.output.filter((item) => item.type === 'chunk');
  if (chunks.length !== 1) {
    throw new Error(
      `Expected one standalone search dialog chunk, received ${String(chunks.length)}`
    );
  }

  const chunk = chunks[0];
  if (!chunk) {
    throw new Error('Standalone search dialog chunk is missing');
  }
  if (chunk.imports.length > 0 || chunk.dynamicImports.length > 0) {
    throw new Error('Standalone search dialog graph must be self-contained');
  }

  // SearchDialog's scoped CSS is already emitted from its SSR shell.
  return chunk.code;
};

const retryableSearchDialogBuildPlugin = (): Plugin => {
  let graphReference: string | undefined;
  let graphEnvironment: SearchDialogGraphEnvironment | undefined;

  return {
    name: 'retryable-search-dialog-build',
    apply: 'build',
    applyToEnvironment: (environment) => environment.name === 'client',
    configResolved(config) {
      graphEnvironment = resolveGraphEnvironment(config);
    },
    buildStart: async function () {
      const graphSource = await buildSearchDialogGraph(requireGraphEnvironment(graphEnvironment));
      graphReference = this.emitFile({
        type: 'asset',
        name: 'SearchDialog.js',
        source: graphSource
      });
    },
    resolveId(id) {
      if (id === assetsModuleId) return resolvedAssetsModuleId;
      return;
    },
    load(id) {
      if (id !== resolvedAssetsModuleId) return;
      if (!graphReference) {
        throw new Error('Search dialog graph assets are not ready');
      }
      return `
        export const searchDialogGraphUrl = import.meta.ROLLUP_FILE_URL_${graphReference};
      `;
    }
  };
};

export const createRetryableSearchDialogDevPlugin = (
  buildGraph: SearchDialogGraphBuilder = buildSearchDialogGraph
): Plugin => {
  let graphSourceRequest: Promise<string> | undefined;
  let graphEnvironment: SearchDialogGraphEnvironment | undefined;

  const loadGraphSource = (): Promise<string> => {
    graphSourceRequest ??= buildGraph(requireGraphEnvironment(graphEnvironment)).catch((error) => {
      graphSourceRequest = undefined;
      throw error;
    });

    return graphSourceRequest;
  };

  return {
    name: 'retryable-search-dialog-dev',
    apply: 'serve',
    applyToEnvironment: (environment) => environment.name === 'client',
    configResolved(config) {
      graphEnvironment = resolveGraphEnvironment(config);
    },
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
        if (!request.url) {
          next();
          return;
        }

        if (new URL(request.url, 'http://vite.local').pathname !== graphDevUrl) {
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
        export const searchDialogGraphUrl = ${JSON.stringify(graphDevUrl)};
      `;
    }
  };
};

export const retryableSearchDialog = (): readonly Plugin[] => [
  retryableSearchDialogBuildPlugin(),
  createRetryableSearchDialogDevPlugin()
];

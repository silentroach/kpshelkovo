import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

const appSource = fileURLToPath(new URL('../../src', import.meta.url));
const appRoot = fileURLToPath(new URL('../..', import.meta.url));
const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url));

export const createVisualFixtureAstroConfig = () =>
  defineConfig({
    output: 'static',
    srcDir: 'src',
    outDir: 'dist',
    vite: {
      resolve: {
        alias: {
          '@': appSource,
        },
      },
      server: {
        fs: {
          allow: [appRoot, workspaceRoot],
        },
      },
    },
    build: {
      format: 'directory',
      assets: 'static',
    },
  });

import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';
import { visualizer } from 'rollup-plugin-visualizer';
import type { Plugin } from 'vite';

const workspace = new URL('../../../../', import.meta.url);
// Strip virtual-module NUL prefixes too, so the native YAML stays diffable text.
const projectRoot = new RegExp(`${RegExp.escape(fileURLToPath(workspace))}|^\0`, 'g');

export const clientBundleAnalysis = (): AstroIntegration => ({
  name: 'client-bundle-analysis',
  hooks: {
    'astro:build:setup': ({ updateConfig }) => {
      updateConfig({
        plugins: [
          {
            name: 'client-bundle-visualizer',
            applyToEnvironment: (environment) =>
              environment.name === 'client' && [
                visualizer({
                  projectRoot,
                  template: 'list',
                  filename: fileURLToPath(new URL('docs/bundle/client.yaml', workspace))
                }) as Plugin,
                visualizer({
                  projectRoot,
                  template: 'treemap',
                  filename: fileURLToPath(new URL('.cache/bundle/client.html', workspace))
                }) as Plugin
              ]
          }
        ]
      });
    }
  }
});

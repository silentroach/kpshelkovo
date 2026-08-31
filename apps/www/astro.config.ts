import { fileURLToPath } from 'node:url';
import { constants } from 'node:zlib';
import type { SitemapItem } from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import compressor from 'astro-compressor';
import tailwindcss from '@tailwindcss/vite';
import {
  applySitemapMetadata,
  shouldIncludeSitemapPage,
  type SitemapMetadataIndex,
} from './src/lib/sitemap';
import { loadSitemapMetadataIndex } from './src/lib/sitemap-data';
import { createAstroMarkdownProcessor } from './src/lib/markdown/astro-processor';
import { indexNowUrlManifest } from './src/integrations/indexnow-url-manifest';
import { apiContractHeaders } from './src/integrations/api-contract-headers';
import { pagefindDevSnapshot } from './src/integrations/pagefind-dev-snapshot';
import { statusCalendarAlternateValidation } from './src/integrations/status-calendar-alternate-validation';

const plugins = [tailwindcss()];
const devServerPort = 4321;
const site = 'https://kpshelkovo.online';
let sitemapMetadataIndex: Promise<SitemapMetadataIndex> | undefined;
const indexNowUrls = new Set<string>();

const loadSitemapMetadata = (): Promise<SitemapMetadataIndex> => {
  sitemapMetadataIndex ??= loadSitemapMetadataIndex();

  return sitemapMetadataIndex;
};

const serializeSitemapItem = async (
  item: SitemapItem,
): Promise<SitemapItem | undefined> => {
  const serializedItem = applySitemapMetadata(
    item,
    await loadSitemapMetadata(),
  );

  if (serializedItem) {
    indexNowUrls.add(serializedItem.url);
  }

  return serializedItem;
};

export default defineConfig({
  output: 'static',
  site,
  server: {
    port: devServerPort,
  },
  cacheDir: '../../node_modules/.astro/www',
  image: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.kpshelkovo.online',
        pathname: '/news/**',
      },
    ],
  },
  markdown: {
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['math', 'change', 'change-inline', 'change-block'],
    },
    processor: createAstroMarkdownProcessor(),
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'tap',
  },
  outDir: 'dist/site',
  srcDir: 'src',
  publicDir: 'public',
  vite: {
    envDir: '../..',
    build: {
      // Keep processed scripts external so CSP does not need broad inline JS.
      assetsInlineLimit: 0,
    },
    server: {
      strictPort: true,
    },
    plugins,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
  integrations: [
    apiContractHeaders(new URL(site)),
    pagefindDevSnapshot(),
    svelte(),
    sitemap({
      filter: shouldIncludeSitemapPage,
      serialize: serializeSitemapItem,
    }),
    statusCalendarAlternateValidation(new URL(site)),
    indexNowUrlManifest(indexNowUrls),
    compressor({
      gzip: {
        level: 9,
      },
      brotli: {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 11,
        },
      },
      zstd: false,
      fileExtensions: [
        '.css',
        '.js',
        '.html',
        '.md',
        '.xml',
        '.cjs',
        '.mjs',
        '.svg',
        '.txt',
        '.json',
      ],
    }),
  ],
  build: {
    format: 'directory',
    assets: 'static',
  },
});

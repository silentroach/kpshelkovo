import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { constants } from 'node:zlib';

import type { SitemapItem } from '@astrojs/sitemap';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import { wwwFonts } from '@shelkovo/ui/fonts';
import compressor from 'astro-compressor';
import { defineConfig, type AstroIntegration } from 'astro/config';

import { clientBundleAnalysis } from './src/integrations/client-bundle-analysis';
import { indexNowUrlManifest } from './src/integrations/indexnow-url-manifest';
import { pagefindDevSnapshot } from './src/integrations/pagefind-dev-snapshot';
import { statusCalendarAlternateValidation } from './src/integrations/status-calendar-alternate-validation';
import { createAstroMarkdownProcessor } from './src/lib/markdown/astro-processor';
import { applySitemapMetadata, shouldIncludeSitemapPage } from './src/lib/sitemap';
import { loadSitemapMetadataIndex } from './src/lib/sitemap-data';

const devServerPort = 4321;
const site = 'https://kpshelkovo.online';
const indexNowUrls = new Set<string>();

const preloadSitemapMetadata = (): AstroIntegration => ({
  name: 'sitemap-metadata',
  hooks: {
    'astro:config:setup': ({ command, injectScript }) => {
      if (command !== 'build') {
        return;
      }

      injectScript(
        'page-ssr',
        `import { loadSitemapMetadataIndex } from '@/lib/sitemap-data';
await loadSitemapMetadataIndex();`
      );
    }
  }
});

const serializeSitemapItem = async (item: SitemapItem): Promise<SitemapItem | undefined> => {
  const serializedItem = applySitemapMetadata(item, await loadSitemapMetadataIndex());

  if (serializedItem) {
    indexNowUrls.add(serializedItem.url);
  }

  return serializedItem;
};

export default defineConfig({
  output: 'static',
  site,
  server: {
    port: devServerPort
  },
  cacheDir: '../../node_modules/.astro/www',
  fonts: wwwFonts,
  image: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.kpshelkovo.online',
        pathname: '/news/**'
      }
    ]
  },
  markdown: {
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['math', 'change', 'change-inline', 'change-block', 'map']
    },
    processor: createAstroMarkdownProcessor()
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'tap'
  },
  outDir: 'dist/site',
  srcDir: 'src',
  publicDir: 'public',
  vite: {
    envDir: '../..',
    plugins: [
      {
        name: 'satteri-native-import',
        enforce: 'pre',
        applyToEnvironment: (environment) => environment.config.consumer === 'server',
        resolveId(id, importer) {
          if (id === 'satteri' && importer) {
            // Keep native binding resolution inside Satteri's package. Resolve
            // from its workspace consumer: pnpm does not expose it at app root.
            return { id: createRequire(importer).resolve(id), external: true };
          }
        }
      }
    ],
    build: {
      // Keep processed scripts external so CSP does not need broad inline JS.
      assetsInlineLimit: 0
    },
    server: {
      strictPort: true
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  },
  integrations: [
    process.env.BUNDLE_ANALYZE === '1' && clientBundleAnalysis(),
    pagefindDevSnapshot(),
    svelte(),
    preloadSitemapMetadata(),
    sitemap({
      filter: shouldIncludeSitemapPage,
      serialize: serializeSitemapItem
    }),
    statusCalendarAlternateValidation(new URL(site)),
    indexNowUrlManifest(indexNowUrls),
    compressor({
      gzip: {
        level: 9
      },
      brotli: {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 11
        }
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
        '.json'
      ]
    })
  ],
  build: {
    format: 'directory',
    assets: 'static'
  }
});

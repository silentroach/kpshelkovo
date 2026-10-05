import { fileURLToPath } from 'node:url';

import { wwwFonts } from '@shelkovo/ui/fonts';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  fonts: wwwFonts,
  srcDir: 'src',
  outDir: 'dist',
  vite: {
    server: {
      fs: {
        allow: [
          fileURLToPath(new URL('../..', import.meta.url)),
          fileURLToPath(new URL('../../../..', import.meta.url))
        ]
      }
    }
  },
  build: {
    format: 'directory',
    assets: 'static'
  }
});

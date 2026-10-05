import { mediaFonts } from '@shelkovo/ui/fonts';
import { defineConfig } from 'astro/config';

const devServerPort = 4322;

export default defineConfig({
  output: 'static',
  site: 'https://media.kpshelkovo.online',
  server: {
    port: devServerPort
  },
  cacheDir: '../../node_modules/.astro/media',
  fonts: mediaFonts,
  outDir: 'dist/site',
  srcDir: 'src',
  vite: {
    server: {
      strictPort: true
    }
  },
  build: {
    format: 'file',
    assets: '_media',
    inlineStylesheets: 'always'
  }
});

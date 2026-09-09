import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isDependencyFile = (filename) =>
  filename.includes('/node_modules/') || filename.includes('\\node_modules\\');

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    experimental: {
      async: true
    }
  },
  vitePlugin: {
    dynamicCompileOptions: ({ filename }) => {
      if (isDependencyFile(filename)) {
        return;
      }

      return { runes: true };
    }
  }
};

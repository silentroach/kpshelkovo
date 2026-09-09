import { satteri } from '@astrojs/markdown-satteri';
import { satteriTypograf } from '@shelkovo/markdown';

export const createAstroMarkdownProcessor = () =>
  satteri({
    hastPlugins: [satteriTypograf()]
  });

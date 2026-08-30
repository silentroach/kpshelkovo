import svelteRenderer from '@astrojs/svelte/server.js';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

type AstroContainerInstance = Awaited<ReturnType<typeof AstroContainer.create>>;

export const createAstroContainer =
  async (): Promise<AstroContainerInstance> => {
    const container = await AstroContainer.create({
      astroConfig: { site: import.meta.env.SITE },
    });
    container.addServerRenderer({ renderer: svelteRenderer });
    container.addClientRenderer({
      name: '@astrojs/svelte',
      entrypoint: '@astrojs/svelte/client.js',
    });

    return container;
  };

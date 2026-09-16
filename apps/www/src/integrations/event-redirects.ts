import type { AstroIntegration } from 'astro';

export const eventRedirects = (): AstroIntegration => ({
  name: 'event-redirects',
  hooks: {
    'astro:config:setup': ({ command, injectScript }) => {
      if (command !== 'build') return;
      // Content collections are available in the server build, not in config hooks.
      // Keep this deploy-only artifact beside dist/site, outside the public web root.
      injectScript(
        'page-ssr',
        `
        import { writeFile as writeEventRedirects } from 'node:fs/promises';
        import { outDir as eventOutputDir } from 'astro:config/server';
        import { loadEventsData as loadRedirectEvents } from '@/lib/events/load';
        import { buildEventRedirects } from '@/lib/events/redirects';
        await writeEventRedirects(new URL('../events-redirects.conf', eventOutputDir),
          buildEventRedirects((await loadRedirectEvents()).events), 'utf8');
      `
      );
    }
  }
});

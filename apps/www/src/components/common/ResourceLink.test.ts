/// <reference types="astro/client" />

import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import ResourceLink from '@shelkovo/ui/ResourceLink.astro';

describe('ResourceLink', () => {
  it('renders PDF links with prefetch opt-out and full reload', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ResourceLink, {
      props: {
        href: '/815/regulation/full.pdf',
        class: 'ui-link',
        type: 'application/pdf',
        reload: true,
        'aria-label': 'Открыть полный регламент',
      },
      slots: {
        default: 'полный регламент',
      },
    });

    expect(html).toContain('href="/815/regulation/full.pdf"');
    expect(html).toContain('class="ui-link"');
    expect(html).toContain('type="application/pdf"');
    expect(html).toContain('aria-label="Открыть полный регламент"');
    expect(html).toContain('data-astro-prefetch="false"');
    expect(html).toContain('data-astro-reload');
    expect(html).toContain('>полный регламент</a>');
  });

  it('preserves download links without forcing a target or reload', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ResourceLink, {
      props: {
        href: '/news/events/community-day.ics',
        download: 'community-day.ics',
        title: 'Добавить в календарь',
      },
      slots: {
        default: 'Добавить в календарь',
      },
    });

    expect(html).toContain('href="/news/events/community-day.ics"');
    expect(html).toContain('download="community-day.ics"');
    expect(html).toContain('title="Добавить в календарь"');
    expect(html).toContain('data-astro-prefetch="false"');
    expect(html).not.toContain('data-astro-reload');
    expect(html).not.toContain('target="_blank"');
  });
});

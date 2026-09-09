/// <reference types="astro/client" />

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import LinkWithIcon from '@shelkovo/ui/LinkWithIcon.astro';
import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

describe('LinkWithIcon', () => {
  it('renders Telegram icon and aria label with custom prefix/label', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(LinkWithIcon, {
      props: {
        href: 'https://t.me/shelkovoecoclub',
        label: '@shelkovoecoclub',
        ariaLabelPrefix: 'Контакт'
      }
    });

    expect(html).toContain('aria-label="Контакт: Telegram"');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('@shelkovoecoclub');
  });

  it('renders Domyland icon and default source label', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(LinkWithIcon, {
      props: {
        href: 'https://okkomfort.domyland.app/news',
        ariaLabelPrefix: 'Источник'
      }
    });

    expect(html).toContain('aria-label="Источник: Домиленд"');
    expect(html).toContain('viewBox="0 0 133 141"');
    expect(html).toContain('>источник<');
  });

  it('renders generic external link with hostname label', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(LinkWithIcon, {
      props: {
        href: 'https://example.com/article',
        label: 'Подробнее',
        ariaLabelPrefix: 'Источник'
      }
    });

    expect(html).toContain('aria-label="Источник: example.com"');
    expect(html).not.toContain('viewBox="0 0 24 24"');
    expect(html).not.toContain('viewBox="0 0 133 141"');
    expect(html).toContain('>Подробнее<');
  });
});

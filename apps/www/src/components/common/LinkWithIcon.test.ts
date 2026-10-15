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

  it.each(['https://okkomfort.domyland.app/news', 'https://lk.domyland.ru/newsfeed/news/119395'])(
    'renders Domyland icon and default source label for %s',
    async (href) => {
      const container = await createAstroContainer();
      const html = await container.renderToString(LinkWithIcon, {
        props: {
          href,
          ariaLabelPrefix: 'Источник'
        }
      });

      expect(html).toContain('aria-label="Источник: Домиленд"');
      expect(html).toContain('viewBox="0 0 133 141"');
      expect(html).toContain('>источник<');
      expect(html).toContain(`href="${href}"`);
    }
  );

  it('renders a globe for generic external links with hostname label', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(LinkWithIcon, {
      props: {
        href: 'https://example.com/article',
        label: 'Подробнее',
        ariaLabelPrefix: 'Источник'
      }
    });

    expect(html).toContain('aria-label="Источник: example.com"');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('stroke="currentColor"');
    expect(html).not.toContain('viewBox="0 0 133 141"');
    expect(html).toContain('>Подробнее<');
  });
});

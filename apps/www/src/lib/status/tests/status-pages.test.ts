/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';
import { loadStatusData } from '@/lib/status/load';
import { statusHistoryUrl } from '@/lib/status/routes';

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import StatusPage from '@/pages/status/index.astro';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import StatusHistoryPage from '@/pages/status/history/index.astro';

const stripTags = (value: string): string => {
  let sanitized = value;
  let previous: string;

  do {
    previous = sanitized;
    sanitized = sanitized.replace(/<[^>]*>/gu, '');
  } while (sanitized !== previous);

  return sanitized.replace(/\s+/gu, ' ').trim();
};

const headingOutline = (html: string): readonly string[] =>
  [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gu)].map(
    ([, level, content]) => `h${level}: ${stripTags(content)}`,
  );

const parseHtml = (html: string) => {
  const document = new Window().document;
  document.write(html);

  return document;
};

describe('/status/', () => {
  it('keeps the service overview heading outline sequential', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(StatusPage);

    expect(headingOutline(html).slice(0, 3)).toMatchInlineSnapshot(`
      [
        "h1: Статус КП Шелково",
        "h2: Сводка по сервисам",
        "h3: Электричество",
      ]
    `);
  });

  it('keeps recent history bounded and links to the full archive', async () => {
    const data = await loadStatusData();
    const container = await createAstroContainer();
    const html = await container.renderToString(StatusPage);
    const document = parseHtml(html);
    const history = document.querySelector('[data-status-history]');

    expect(history?.querySelectorAll('article')).toHaveLength(
      Math.min(10, data.incidents.length),
    );
    expect(
      history?.querySelector(`a[href="${statusHistoryUrl()}"]`),
    ).not.toBeNull();
  });
});

describe('/status/history/', () => {
  it('renders every incident without client-side loading', async () => {
    const data = await loadStatusData();
    const container = await createAstroContainer();
    const html = await container.renderToString(StatusHistoryPage);
    const document = parseHtml(html);

    expect(
      document.querySelectorAll('[data-status-history] article'),
    ).toHaveLength(data.incidents.length);
  });
});

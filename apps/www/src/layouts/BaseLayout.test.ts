/// <reference types="astro/client" />

import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';
import { SEARCH_SECTIONS } from '@/lib/search/sections';
import type { SearchDocument, SearchScope } from '@/lib/search/types';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import BaseLayout from './BaseLayout.astro';

const renderLayout = async (pathname: string) => {
  const container = await createAstroContainer();

  return container.renderToString(BaseLayout, {
    request: new Request(`https://example.com${pathname}`),
  });
};

const searchDocument = (
  scope: SearchScope,
  description?: string,
): SearchDocument => ({
  scope,
  title: 'Чистый заголовок',
  description,
  section: SEARCH_SECTIONS.news,
  publishedAt: '2026-08-14',
  tags: ['тариф', 'дороги'],
  aliases: ['как проехать к дому'],
});

describe('BaseLayout site header', () => {
  it('shows the common site header on tariff pages', async () => {
    const html = await renderLayout('/815/compare/');

    expect(html).toContain('<header class="site-header');
  });

  it('shows the common site header on the home page', async () => {
    const html = await renderLayout('/');

    expect(html).toContain('class="ui-root-site site-has-header');
    expect(html.match(/data-search-trigger/g)).toHaveLength(2);
  });
});

describe('BaseLayout markdown discovery', () => {
  it('advertises the markdown companion in HTML', async () => {
    const html = await renderLayout('/815/compare/');

    expect(html).toContain(
      '<link rel="alternate" type="text/markdown" href="https://kpshelkovo.online/815/compare/index.md">',
    );
  });

  it('does not advertise a nonexistent companion for an error page', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(BaseLayout, {
      request: new Request('https://example.com/404.html'),
      props: { robots: 'noindex, nofollow' },
    });

    expect(html).not.toContain('type="text/markdown"');
  });
});

describe('BaseLayout search contract', () => {
  it('renders one inert search shell outside the indexed content', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(BaseLayout, {
      request: new Request('https://example.com/news/'),
      props: { search: searchDocument('page') },
    });

    expect(html.match(/<dialog/g)).toHaveLength(1);
    expect(html).toContain('data-search-dialog-root');
    expect(html).toContain('data-search-input');
    expect(html.match(/data-search-trigger/g)).toHaveLength(2);
    expect(html.indexOf('<dialog')).toBeGreaterThan(
      html.indexOf('data-pagefind-root'),
    );
  });

  it('does not opt a page into Pagefind by default', async () => {
    const html = await renderLayout('/news/');

    expect(html).not.toContain('data-pagefind-root');
    expect(html).not.toContain('data-pagefind-body');
  });

  it('publishes clean metadata and marks the page scope as searchable', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(BaseLayout, {
      request: new Request('https://example.com/news/2026/08/example/'),
      props: {
        title: 'Чистый заголовок — Новости — Шелково Онлайн',
        search: searchDocument('page', 'Описание для поиска'),
      },
      slots: { default: '<h1>Чистый заголовок</h1>' },
    });

    expect(html).toContain('data-pagefind-root');
    expect(html).toContain('data-pagefind-body');
    expect(html).toContain('data-search-title="Чистый заголовок"');
    expect(html).toContain('data-search-description="Описание для поиска"');
    expect(html).toContain('data-search-section-id="news"');
    expect(html).toContain('data-search-section-label="Новости"');
    expect(html).toContain('data-search-published-at="2026-08-14"');
    expect(html).toContain('data-search-tags="тариф, дороги"');
    expect(html).toContain('data-search-aliases="как проехать к дому"');
    expect(html).toContain('tags[data-search-tags]');
    expect(html).toContain('aliases[data-search-aliases]');
    expect(html).toContain(
      'data-pagefind-sort="date[data-search-published-at]"',
    );
  });

  it('publishes metadata without choosing a body for manual scope', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(BaseLayout, {
      request: new Request('https://example.com/manual/'),
      props: { search: searchDocument('manual') },
    });

    expect(html).toContain('data-pagefind-root');
    expect(html).toContain('data-pagefind-meta=');
    expect(html).not.toContain('description[data-search-description]');
    expect(html).not.toContain('data-search-description');
    expect(html).not.toContain('data-pagefind-body');
  });
});

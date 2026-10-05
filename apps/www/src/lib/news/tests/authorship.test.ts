import { readFileSync } from 'node:fs';

import * as content from 'astro:content';
import { Window } from 'happy-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';
import { z } from 'zod';

// @ts-expect-error Astro components are resolved by Astro/Vitest.
import NewsCard from '@/components/news/NewsCard.astro';
// @ts-expect-error Astro pages are resolved by Astro/Vitest.
import NewsPage from '@/pages/news/[year]/[month]/[entry]/index.astro';
import { GET as getArticles } from '@/pages/news/data/articles.json';
import { GET as getFeed } from '@/pages/news/feed.xml';
import { createAstroContainer } from '@/test/astro-container';

import * as news from '../load';
import type { NewsAuthorEntry } from '../load';
import { newsArticleEntry, newsArchiveSummaryEntries, newsAuthorEntry } from '../load.test-helper';
import { buildNewsArticleMarkdown } from '../markdown';
import { newsPublicPayloadSchema } from '../public-schema';
import { RawNewsAuthorSchema } from '../raw-schema';

const readAuthor = (id: string): NewsAuthorEntry => ({
  id,
  data: RawNewsAuthorSchema.parse(
    parse(readFileSync(new URL(`../../../data/news/authors/${id}.yaml`, import.meta.url), 'utf8'))
  )
});
const editorial = readAuthor('editorial');

const fixture = (author = editorial, withCover = false) => {
  const source = newsArticleEntry({
    id: '2026/10/authorship',
    title: 'Test article',
    summary: 'Test summary',
    body: 'Test body',
    date: '02.10.2026',
    tags: ['новости']
  });
  const entry = {
    ...source,
    collection: 'newsArticles' as const,
    data: {
      ...source.data,
      author: { collection: 'newsAuthors' as const, id: author.id },
      areas: ['forest' as const],
      source_url: 'https://example.com/source',
      cover: withCover
        ? { src: '/cover.jpg', width: 1280, height: 960, format: 'jpg' as const }
        : undefined,
      cover_alt: withCover ? 'Cover' : undefined
    }
  };
  const data = news.buildNewsDataset([author], [entry], newsArchiveSummaryEntries([entry]));
  const article = data.articles[0]!;
  vi.spyOn(news, 'loadNewsArticle').mockResolvedValue(article);
  vi.spyOn(news, 'loadNewsData').mockResolvedValue(data);
  vi.spyOn(content, 'getEntry').mockResolvedValue(entry);
  return article;
};

let window: Window;
beforeEach(() => {
  window = new Window();
});
afterEach(() => {
  window.close();
  vi.restoreAllMocks();
});

const renderPage = async () => {
  const container = await createAstroContainer();
  const html = await container.renderToString(NewsPage, {
    params: { year: '2026', month: '10', entry: 'authorship' },
    request: new Request('https://example.com/news/2026/10/authorship/')
  });
  window.document.write(html);
  const schema = [...window.document.querySelectorAll('script[type="application/ld+json"]')]
    .map((script) => z.record(z.string(), z.unknown()).parse(JSON.parse(script.textContent)))
    .find((item) => item['@type'] === 'NewsArticle');
  if (!schema) throw new Error('NewsArticle schema missing');
  return schema;
};

describe('news authorship', () => {
  it('omits the editorial signature from cards while keeping the publication date', async () => {
    const article = fixture();
    const container = await createAstroContainer();
    window.document.body.innerHTML = await container.renderToString(NewsCard, {
      props: { article }
    });
    const meta = window.document.querySelector('.news-meta')!;
    expect(meta.textContent).not.toContain(article.author.name);
    expect(meta.querySelector('time')?.getAttribute('datetime')).toBe(article.publishedIso);
    expect(
      [...meta.children].filter(
        (element) => !element.textContent.trim() && !element.children.length
      )
    ).toHaveLength(0);
  });

  it.each([false, true])(
    'keeps article metadata without an editorial signature (cover: %s)',
    async (withCover) => {
      const article = fixture(editorial, withCover);
      const schema = await renderPage();
      const meta = window.document.querySelector('main .news-meta')!;
      expect({
        visibleAuthor: meta.textContent.includes(article.author.name),
        date: meta.querySelector('time')?.getAttribute('datetime'),
        area: meta.querySelector('[role="img"]')?.getAttribute('aria-label'),
        source: meta.querySelector('a[href="https://example.com/source"]')?.getAttribute('href'),
        emptyElements: [...meta.children].filter(
          (element) => !element.textContent.trim() && !element.children.length
        ).length,
        schemaType: schema['@type'],
        schemaAuthor: schema.author
      }).toMatchInlineSnapshot(`
      {
        "area": "Шелково Форест",
        "date": "2026-10-02T00:00:00+03:00",
        "emptyElements": 0,
        "schemaAuthor": undefined,
        "schemaType": "NewsArticle",
        "source": "https://example.com/source",
        "visibleAuthor": false,
      }
    `);
      expect(Boolean(window.document.querySelector('main img[aria-hidden="true"]'))).toBe(
        withCover
      );
    }
  );

  it.each([
    { author: readAuthor('ig'), schemaType: 'Person' },
    { author: readAuthor('ig-global'), schemaType: 'Person' },
    { author: readAuthor('ok-comfort'), schemaType: 'Organization' },
    {
      author: newsAuthorEntry({ id: 'writer', name: 'Writer', kind: 'other' }),
      schemaType: 'Person'
    }
  ])(
    'preserves $author.id signatures and structured authorship',
    async ({ author, schemaType }) => {
      const article = fixture(author);
      const container = await createAstroContainer();
      const card = await container.renderToString(NewsCard, { props: { article } });
      expect(card).toContain(author.data.name);
      const schema = await renderPage();
      expect(window.document.querySelector('main .news-meta')?.textContent).toContain(
        author.data.name
      );
      expect(schema.author).toMatchObject({ '@type': schemaType, name: author.data.name });
      if (author.data.url) {
        expect(schema.author).toHaveProperty('url', author.data.url);
        expect(
          window.document.querySelector(`main .news-meta a[href="${author.data.url}"]`)
        ).toBeTruthy();
      }
    }
  );

  it('retains editorial authorship in serialized JSON and Markdown', async () => {
    const article = fixture();
    const response = await getArticles({} as never);
    const payload = newsPublicPayloadSchema.parse(await response.json());
    const markdown = buildNewsArticleMarkdown(article);
    const frontmatter = z.object({ author: z.unknown() }).parse(parse(markdown.split('---')[1]!));
    expect({ json: payload.articles[0]!.author, markdown: frontmatter.author })
      .toMatchInlineSnapshot(`
      {
        "json": {
          "id": "editorial",
          "kind": "editorial",
          "name": "Редакция",
        },
        "markdown": {
          "id": "editorial",
          "kind": "editorial",
          "name": "Редакция",
        },
      }
    `);
  });

  it('keeps RSS without an author while retaining the article link and summary', async () => {
    const article = fixture();
    const response = await getFeed({ site: new URL('https://example.com') } as never);
    const document = new window.DOMParser().parseFromString(
      await response.text(),
      'application/xml'
    );
    const item = document.querySelector('item')!;
    expect(item.getElementsByTagName('author')).toHaveLength(0);
    expect(item.getElementsByTagName('dc:creator')).toHaveLength(0);
    expect(item.querySelector('description')?.textContent).toBe(article.summary);
    expect(item.querySelector('link')?.textContent).toContain(article.url);
  });
});

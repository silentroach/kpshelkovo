/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { afterAll, describe, expect, it } from 'vitest';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import HomeNewsArticle from '@/components/home/HomeNewsArticle.astro';
import { buildNewsDataset } from '@/lib/news/load';
import {
  createTestNewsDatasetBuilder,
  newsArticleEntry,
  newsAuthorEntry
} from '@/lib/news/load.test-helper';
import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import NewsCard from '../NewsCard.astro';

const source = {
  title: '"Встреча" - 8-10 октября',
  summary: '"Работы" - с 11-13 октября'
} as const;
const article = Object.freeze(
  createTestNewsDatasetBuilder(buildNewsDataset)(
    [newsAuthorEntry({ id: 'ig', name: 'Редакция' })],
    [newsArticleEntry({ id: '2026/10/typography', ...source, date: '02.10.2026' })]
  ).articles[0]!
);
const window = new Window();
const document = window.document;
afterAll(() => window.happyDOM.close());

describe('NewsCard typography', () => {
  it('formats both fields like the homepage without changing source strings or the link', async () => {
    const container = await createAstroContainer();
    document.body.innerHTML =
      (await container.renderToString(NewsCard, { props: { article } })) +
      (await container.renderToString(HomeNewsArticle, { props: { article } }));

    const fields = [...document.querySelectorAll('.news-card h3 a, .news-card p')];
    const homeFields = [
      ...document.querySelectorAll('.home-news-article h2 a, .home-news-article p')
    ];
    expect(fields.map((field) => field.innerHTML)).toEqual(
      homeFields.map((field) => field.innerHTML)
    );
    expect(
      fields.map((field) => ({
        text: field.textContent.replaceAll('\u00a0', '·'),
        range: field.querySelector('.nowrap-date-range')?.textContent.replaceAll('\u00a0', '·')
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "range": "8–10·октября",
          "text": "«Встреча»·— 8–10·октября",
        },
        {
          "range": "11–13·октября",
          "text": "«Работы»·— с·11–13·октября",
        },
      ]
    `);
    expect({ title: article.title, summary: article.summary }).toEqual(source);
    expect(fields[0]?.getAttribute('href')).toBe(article.url);
  });

  it('keeps literal tags, entities and handlers as text in both fields', async () => {
    const literal =
      '<em onclick=alert(1)>text</em> <img src=x onerror=alert(1)> <script>throw 1</script> &amp; &#60;script&#62;';
    const container = await createAstroContainer();
    document.body.innerHTML = await container.renderToString(NewsCard, {
      props: { article: { ...article, title: literal, summary: literal } }
    });

    const fields = [...document.querySelectorAll('.news-card h3 a, .news-card p')];
    expect(fields).toHaveLength(2);
    for (const field of fields) {
      expect(field.textContent).toBe(literal);
      expect(field.querySelectorAll('*')).toHaveLength(0);
      expect(field.getAttributeNames().some((name) => name.startsWith('on'))).toBe(false);
    }
  });
});

import { globSync, readFileSync } from 'node:fs';

import { z } from 'astro/zod';
import { beforeAll, describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import {
  createTestNewsDatasetBuilder,
  newsArticleEntry as article,
  newsAuthorEntry as author
} from '../load.test-helper';

let buildNewsDataset: ReturnType<typeof createTestNewsDatasetBuilder>;

beforeAll(async () => {
  Object.assign(import.meta.env, { SITE: 'https://example.com', BASE_URL: '/' });
  const load = await import('../load');
  buildNewsDataset = createTestNewsDatasetBuilder(load.buildNewsDataset);
});

const authors = [author({ id: 'ig', name: 'Редакция' })];
const older = (label: string) =>
  article({
    id: '2026/05/older',
    title: 'Первая новость',
    summary: 'Проверка тегов.',
    date: '01.05.2026',
    tags: [label]
  });
const newer = (label: string) =>
  article({
    id: '2026/05/newer',
    title: 'Вторая новость',
    summary: 'Проверка тегов.',
    date: '02.05.2026',
    tags: [label]
  });

describe.each([false, true])('news tag labels (reverse input: %s)', (reverse) => {
  it('rejects a newer hyphenated label for the same key', () => {
    const entries = [older('дорожные работы'), newer('дорожные-работы')];

    expect(() =>
      buildNewsDataset(authors, reverse ? entries.toReversed() : entries)
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: news tag key "дорожные-работы" has conflicting labels: "дорожные-работы" in article "2026/05/newer" and "дорожные работы" in article "2026/05/older"]`
    );
  });

  it('rejects a newer spaced label for the same key', () => {
    const entries = [older('дорожные-работы'), newer('дорожные работы')];

    expect(() =>
      buildNewsDataset(authors, reverse ? entries.toReversed() : entries)
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: news tag key "дорожные-работы" has conflicting labels: "дорожные работы" in article "2026/05/newer" and "дорожные-работы" in article "2026/05/older"]`
    );
  });

  it.each(['дорожные работы', '  дорожные   работы  '])(
    'keeps repeated labels and whitespace normalization: %j',
    (label) => {
      const entries = [older('дорожные работы'), newer(label)];
      const data = buildNewsDataset(authors, reverse ? entries.toReversed() : entries);
      const topic = data.byTag.get('дорожные-работы');

      expect({
        label: topic?.label,
        url: topic?.url,
        markdownUrl: topic?.markdownUrl,
        count: topic?.count,
        articles: topic?.latest.map((item) => item.id)
      }).toMatchInlineSnapshot(`
        {
          "articles": [
            "2026/05/newer",
            "2026/05/older",
          ],
          "count": 2,
          "label": "дорожные работы",
          "markdownUrl": "/news/tags/дорожные-работы/index.md",
          "url": "/news/tags/дорожные-работы/",
        }
      `);
      for (const item of [...data.articles, ...data.home.latest, ...(topic?.latest ?? [])]) {
        expect(item.tags).toMatchInlineSnapshot(`
          [
            {
              "key": "дорожные-работы",
              "label": "дорожные работы",
              "url": "/news/tags/дорожные-работы/",
            },
          ]
        `);
      }
    }
  );
});

it('accepts tags from every current news article with consistent topic labels', () => {
  const root = new URL('../../../data/news/articles/', import.meta.url);
  const inputSchema = z.object({ date: z.string(), tags: z.array(z.string()).optional() });
  const entries = globSync('**/*.md', { cwd: root }).map((file) => {
    const source = readFileSync(new URL(file, root), 'utf8');
    const frontmatter = source.match(/^---\r?\n([\s\S]+?)\r?\n---(?:\r?\n|$)/)?.[1];
    if (!frontmatter) {
      throw new Error(`Missing news frontmatter in ${file}`);
    }

    const input = inputSchema.parse(parseYaml(frontmatter));
    return article({
      id: file.replace(/(?:\/index)?\.md$/, ''),
      title: file,
      summary: 'Проверка тегов текущих новостей.',
      date: input.date,
      tags: input.tags
    });
  });
  const data = buildNewsDataset(authors, entries);

  expect(data.articles.length).toBeGreaterThan(0);
  expect(data.tags.length).toBeGreaterThan(0);
  for (const item of data.articles) {
    for (const tag of item.tags) {
      expect(data.byTag.get(tag.key)).toMatchObject({ label: tag.label, url: tag.url });
    }
  }
});

import { beforeAll, describe, expect, it } from 'vitest';

import { createPersonMentionTarget } from '../people/mentions';
import type { NewsArticle } from './types';

let createNewsArticleMentionRefs: typeof import('./mentions').createNewsArticleMentionRefs;

beforeAll(async () => {
  ({ createNewsArticleMentionRefs } = await import('./mentions'));
});

const target = createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин');

const article = (input?: {
  readonly mentions?: NewsArticle['mentions'];
}): Pick<
  NewsArticle,
  | 'id'
  | 'title'
  | 'url'
  | 'markdownUrl'
  | 'body'
  | 'mentions'
  | 'publishedIso'
  | 'publishedAt'
> => ({
  id: '2026/05/electricity',
  title: 'Авария на линии',
  url: '/news/2026/05/electricity/',
  markdownUrl: '/news/2026/05/electricity/index.md',
  body: 'Первый абзац про [Кирилл Щемелинин](/people/kschemelinin/).\n\nВторой абзац.',
  mentions: input?.mentions ?? [target],
  publishedIso: '2026-05-03T09:00:00+03:00',
  publishedAt: new Date('2026-05-03T06:00:00.000Z'),
});

describe('createNewsArticleMentionRefs', () => {
  it('creates article source refs with news presentation fields', () => {
    expect(createNewsArticleMentionRefs(article())).toEqual([
      {
        target: { type: 'person', slug: 'kschemelinin' },
        source: {
          section: 'news',
          kind: 'article',
          id: '2026/05/electricity',
        },
        title: 'Авария на линии',
        htmlUrl: '/news/2026/05/electricity/',
        markdownUrl: '/news/2026/05/electricity/index.md',
        excerpt: 'Первый абзац про Кирилл Щемелинин.',
        mentionedAt: '2026-05-03T09:00:00+03:00',
        sortKey: new Date('2026-05-03T06:00:00.000Z').valueOf(),
      },
    ]);
  });

  it('dedupes repeated targets inside one article', () => {
    expect(
      createNewsArticleMentionRefs(article({ mentions: [target, target] })),
    ).toHaveLength(1);
  });

  it('does not read the body when the article has no mentions', () => {
    expect(
      createNewsArticleMentionRefs({
        ...article({ mentions: [] }),
        get body(): string {
          throw new Error('body should not be read');
        },
      }),
    ).toEqual([]);
  });
});

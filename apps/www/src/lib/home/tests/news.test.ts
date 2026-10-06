import { describe, expect, it } from 'vitest';

import { selectHomeNews } from '@/lib/home/news';
import { buildNewsDataset, type NewsArticleEntry } from '@/lib/news/load';
import {
  createTestNewsDatasetBuilder,
  newsArticleEntry,
  newsAuthorEntry
} from '@/lib/news/load.test-helper';
import type { NewsArticle } from '@/lib/news/types';

const buildNews = createTestNewsDatasetBuilder(buildNewsDataset);
const authors = [newsAuthorEntry({ id: 'ig', name: 'Test author', kind: 'community' })];

const article = (
  id: string,
  date: string,
  pinned = false,
  pinnedUntil?: string
): NewsArticleEntry =>
  newsArticleEntry({
    id: `2026/05/${id}`,
    title: id,
    summary: id,
    date,
    pinned,
    pinned_until: pinnedUntil
  });

const selectionIds = (articles: readonly NewsArticle[]) => {
  const { lead, secondary } = selectHomeNews(articles);
  return { lead: lead?.entry, secondary: secondary.map((item) => item.entry) };
};

describe('selectHomeNews', () => {
  it('leads with the oldest active pin and takes two freshest articles regardless of pinning', () => {
    const data = buildNews(
      authors,
      [
        article('old-regular', '01.05.2026'),
        article('old-pin', '03.05.2026 09:00', true, '07.05.2026'),
        article('new-pin', '03.05.2026 12:00', true, '07.05.2026'),
        article('latest', '04.05.2026'),
        article('other-regular', '02.05.2026')
      ],
      { now: new Date('2026-05-06T12:00:00+03:00') }
    );

    expect(selectionIds(Object.freeze(data.articles.toReversed()))).toMatchInlineSnapshot(`
      {
        "lead": "old-pin",
        "secondary": [
          "latest",
          "new-pin",
        ],
      }
    `);
  });

  it('keeps a pin without an expiry as the lead years after publication', () => {
    const data = buildNews(
      authors,
      [article('permanent', '01.05.2026', true), article('latest', '05.05.2026')],
      { now: new Date('2030-01-01T00:00:00+03:00') }
    );

    expect(selectionIds(data.articles)).toEqual({ lead: 'permanent', secondary: ['latest'] });
  });

  it.each([
    { now: '2026-05-06T11:59:59.999+03:00', lead: 'pinned', secondary: 'latest' },
    { now: '2026-05-06T12:00:00+03:00', lead: 'latest', secondary: 'pinned' },
    { now: '2026-05-07T12:00:00+03:00', lead: 'latest', secondary: 'pinned' }
  ])('uses the build-time pin state at $now', ({ now, lead, secondary }) => {
    const data = buildNews(
      authors,
      [article('pinned', '01.05.2026', true, '06.05.2026 12:00'), article('latest', '05.05.2026')],
      { now: new Date(now) }
    );

    expect(selectionIds(data.articles)).toEqual({ lead, secondary: [secondary] });
  });

  it('selects the three freshest articles when there are no pins', () => {
    const data = buildNews(authors, [
      article('oldest', '01.05.2026'),
      article('latest', '05.05.2026 12:00'),
      article('date-only', '05.05.2026'),
      article('morning', '05.05.2026 09:00')
    ]);

    expect(selectionIds(data.articles)).toMatchInlineSnapshot(`
      {
        "lead": "latest",
        "secondary": [
          "morning",
          "date-only",
        ],
      }
    `);
  });

  it.each([false, true])(
    'keeps the shared ID tie-breaker for equal dates (pinned: %s)',
    (pinned) => {
      const data = buildNews(authors, [
        article('charlie', '05.05.2026 12:00', pinned),
        article('bravo', '05.05.2026 12:00', pinned),
        article('alpha', '05.05.2026 12:00', pinned)
      ]);

      expect(selectionIds(data.articles.toReversed())).toMatchInlineSnapshot(`
      {
        "lead": "alpha",
        "secondary": [
          "bravo",
          "charlie",
        ],
      }
    `);
    }
  );

  it.each([
    { count: 0, pinned: false, lead: undefined, secondary: [] },
    { count: 1, pinned: false, lead: 'older', secondary: [] },
    { count: 1, pinned: true, lead: 'older', secondary: [] },
    { count: 2, pinned: false, lead: 'newer', secondary: ['older'] },
    { count: 2, pinned: true, lead: 'older', secondary: ['newer'] }
  ])(
    'handles $count articles without duplicates (pinned: $pinned)',
    ({ count, pinned, lead, secondary }) => {
      const data = buildNews(
        authors,
        [article('older', '01.05.2026', pinned), article('newer', '02.05.2026')].slice(0, count)
      );

      expect(selectionIds(data.articles)).toEqual({ lead, secondary });
    }
  );

  it('returns the original domain articles with their author, date and content intact', () => {
    const data = buildNews(authors, [
      article('older', '01.05.2026', true),
      article('newer', '02.05.2026')
    ]);
    const selection = selectHomeNews(data.articles);

    expect(selection.lead).toBe(data.byId.get('2026/05/older'));
    expect(selection.secondary[0]).toBe(data.byId.get('2026/05/newer'));
  });
});

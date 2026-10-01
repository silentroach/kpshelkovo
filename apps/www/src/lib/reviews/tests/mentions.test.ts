import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPersonMentionTarget } from '@/lib/people/mentions';

import { createReviewMentionRefs } from '../mentions';
import type { Review } from '../types';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-01T09:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const target = createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин');

const review = (input?: {
  readonly mentions?: Review['mentions'];
}): Pick<
  Review,
  'id' | 'title' | 'url' | 'markdownUrl' | 'body' | 'mentions' | 'publishedIso' | 'publishedAt'
> => ({
  id: '2026-06-25-test',
  title: 'Отзыв о жизни в поселке',
  url: '/reviews/2026-06-25-test/',
  markdownUrl: '/reviews/2026-06-25-test/index.md',
  body: 'Первый абзац с [Кирилл Щемелинин](/people/kschemelinin/).\n\nВторой абзац.',
  mentions: input?.mentions ?? [target],
  publishedIso: '2026-06-25',
  publishedAt: new Date('2026-06-25T00:00:00.000Z')
});

describe('createReviewMentionRefs', () => {
  it('shortens a generated title while preserving the raw backlink datetime and URLs', () => {
    const ref = createReviewMentionRefs({ ...review(), title: undefined })[0]!;

    expect({
      title: ref.title,
      mentionedAt: ref.mentionedAt,
      htmlUrl: ref.htmlUrl,
      markdownUrl: ref.markdownUrl
    }).toMatchInlineSnapshot(`
      {
        "htmlUrl": "/reviews/2026-06-25-test/",
        "markdownUrl": "/reviews/2026-06-25-test/index.md",
        "mentionedAt": "2026-06-25T00:00:00.000Z",
        "title": "Отзыв собственника от 25 июня",
      }
    `);
  });

  it('creates review source refs with review presentation fields', () => {
    expect(createReviewMentionRefs(review())).toMatchInlineSnapshot(`
      [
        {
          "excerpt": "Первый абзац с Кирилл Щемелинин.",
          "htmlUrl": "/reviews/2026-06-25-test/",
          "markdownUrl": "/reviews/2026-06-25-test/index.md",
          "mentionedAt": "2026-06-25T00:00:00.000Z",
          "sortKey": 1782345600000,
          "source": {
            "id": "2026-06-25-test",
            "kind": "review",
            "section": "reviews",
          },
          "target": {
            "slug": "kschemelinin",
            "type": "person",
          },
          "title": "Отзыв о жизни в поселке",
        },
      ]
    `);
  });

  it('dedupes repeated targets inside one review', () => {
    expect(createReviewMentionRefs(review({ mentions: [target, target] }))).toHaveLength(1);
  });

  it('does not read the body when the review has no mentions', () => {
    expect(
      createReviewMentionRefs({
        ...review({ mentions: [] }),
        get body(): string {
          throw new Error('body should not be read');
        }
      })
    ).toEqual([]);
  });
});

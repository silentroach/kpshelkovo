import { describe, expect, it } from 'vitest';

import { createPersonMentionTarget } from '@/lib/people/mentions';

import { createReviewMentionRefs } from '../mentions';
import type { Review } from '../types';

const target = createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин');

const review = (input?: {
  readonly mentions?: Review['mentions'];
}): Pick<
  Review,
  | 'id'
  | 'title'
  | 'url'
  | 'markdownUrl'
  | 'body'
  | 'mentions'
  | 'publishedIso'
  | 'publishedAt'
> => ({
  id: '2026-06-25-test',
  title: 'Отзыв о жизни в поселке',
  url: '/reviews/2026-06-25-test/',
  markdownUrl: '/reviews/2026-06-25-test/index.md',
  body: 'Первый абзац с [Кирилл Щемелинин](/people/kschemelinin/).\n\nВторой абзац.',
  mentions: input?.mentions ?? [target],
  publishedIso: '2026-06-25',
  publishedAt: new Date('2026-06-25T00:00:00.000Z'),
});

describe('createReviewMentionRefs', () => {
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
    expect(
      createReviewMentionRefs(review({ mentions: [target, target] })),
    ).toHaveLength(1);
  });

  it('does not read the body when the review has no mentions', () => {
    expect(
      createReviewMentionRefs({
        ...review({ mentions: [] }),
        get body(): string {
          throw new Error('body should not be read');
        },
      }),
    ).toEqual([]);
  });
});

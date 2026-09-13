import { describe, expect, it, vi } from 'vitest';

import { reviewSourceId } from '../source';

describe('reviewSourceId', () => {
  it.each(['2026-09-07', new Date('2026-09-07')])(
    'uses frontmatter date and slug, not the filename',
    (published_at) => {
      expect(
        reviewSourceId('archive/draft.md', { published_at, slug: 'owner-2' }, () => 'Review')
      ).toBe('2026-09-07-owner-2');
    }
  );

  it.each([
    ['review.yaml', {}, 'must be a Markdown file'],
    ['review.md', undefined, 'must define published_at and slug'],
    ['review.md', { published_at: '2026-09-07' }, 'must define published_at and slug'],
    ['review.md', { slug: 'owner', published_at: undefined }, 'must define published_at and slug'],
    [
      'review.md',
      { published_at: '07.09.2026', slug: 'Bad_slug' },
      'published_at must use YYYY-MM-DD'
    ],
    [
      'review.md',
      { published_at: '2026-09-07', slug: 'Bad_slug' },
      'slug must use lower-case Latin letters, digits, and hyphen'
    ]
  ])('rejects invalid identity before reading body: %j %j', (entry, data, reason) => {
    const readBody = vi.fn(() => '');
    expect(() => reviewSourceId(entry, data, readBody)).toThrow(`review path "${entry}" ${reason}`);
    expect(readBody).not.toHaveBeenCalled();
  });

  it.each(['', ' \n\t'])('requires non-blank body', (body) => {
    expect(() =>
      reviewSourceId('review.md', { published_at: '2026-09-07', slug: 'owner' }, () => body)
    ).toThrowErrorMatchingInlineSnapshot(`[Error: review path "review.md" body is required]`);
  });

  it('propagates read errors after validating identity', () => {
    const error = new Error('read failed');
    expect(() =>
      reviewSourceId('review.md', { published_at: '2026-09-07', slug: 'owner' }, () => {
        throw error;
      })
    ).toThrow(error);
  });
});

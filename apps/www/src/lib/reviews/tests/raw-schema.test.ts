import { describe, expect, it } from 'vitest';

import { RawReviewSchema } from '../raw-schema';

describe('RawReviewSchema', () => {
  it('accepts a minimal review frontmatter', () => {
    expect(
      RawReviewSchema.parse({
        published_at: '2026-06-25',
        slug: 'life-in-shelkovo-forest',
        area: 'forest'
      })
    ).toEqual({
      published_at: '2026-06-25',
      slug: 'life-in-shelkovo-forest',
      area: 'forest'
    });
  });

  it('accepts optional author, title, and aspect blocks', () => {
    expect(
      RawReviewSchema.parse({
        published_at: '2026-06-25',
        slug: 'with-aspects',
        area: 'river',
        author: 'Алексей',
        title: 'Год жизни в Шелково',
        aspects: [
          { type: 'place', rating: 5, body: 'Лес и пруды рядом.' },
          { type: 'management', body: 'По обслуживанию есть вопросы.' }
        ]
      }).aspects
    ).toEqual([
      { type: 'place', rating: 5, body: 'Лес и пруды рядом.' },
      { type: 'management', body: 'По обслуживанию есть вопросы.' }
    ]);
  });

  it('rejects forbidden public contract fields', () => {
    const result = RawReviewSchema.safeParse({
      published_at: '2026-06-25',
      slug: 'bad-contract',
      area: 'forest',
      overall_rating: 5
    });

    expect(result.success).toBe(false);
  });

  it('rejects impossible calendar dates', () => {
    const result = RawReviewSchema.safeParse({
      published_at: '2026-13-40',
      slug: 'bad-date',
      area: 'forest'
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown aspect fields', () => {
    const result = RawReviewSchema.safeParse({
      published_at: '2026-06-25',
      slug: 'bad-aspect-field',
      area: 'forest',
      aspects: [{ type: 'place', rtaing: 5 }]
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid ratings and duplicate aspect types', () => {
    expect(
      RawReviewSchema.safeParse({
        published_at: '2026-06-25',
        slug: 'bad-rating',
        area: 'forest',
        aspects: [{ type: 'place', rating: 6 }]
      }).success
    ).toBe(false);

    expect(
      RawReviewSchema.safeParse({
        published_at: '2026-06-25',
        slug: 'duplicate-aspects',
        area: 'forest',
        aspects: [{ type: 'place' }, { type: 'place', rating: 4 }]
      }).success
    ).toBe(false);
  });
});

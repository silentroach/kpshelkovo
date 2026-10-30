import { z } from 'astro/zod';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { ReviewEntry } from '../load';

const mocks = vi.hoisted(() => ({
  getCollection: vi.fn(),
  loadSiteMentionRegistry: vi.fn()
}));

vi.mock('astro:content', () => ({
  getCollection: mocks.getCollection
}));

vi.mock('@/lib/mentions/registry', () => ({
  loadSiteMentionRegistry: mocks.loadSiteMentionRegistry
}));

let buildReviewsDataset: typeof import('../load').buildReviewsDataset;
let loadReviewsData: typeof import('../load').loadReviewsData;
let createSiteMentionRegistry: typeof import('@/lib/mentions').createSiteMentionRegistry;
let createPersonMentionTarget: typeof import('@/lib/people/mentions').createPersonMentionTarget;
let createPlaceMentionTarget: typeof import('@/lib/places/mentions').createPlaceMentionTarget;
let createReviewMentionRefs: typeof import('../mentions').createReviewMentionRefs;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/'
  });

  ({ createSiteMentionRegistry } = await import('@/lib/mentions'));
  ({ createPersonMentionTarget } = await import('@/lib/people/mentions'));
  ({ createPlaceMentionTarget } = await import('@/lib/places/mentions'));
  ({ createReviewMentionRefs } = await import('../mentions'));
  ({ buildReviewsDataset, loadReviewsData } = await import('../load'));
});

const entry = (input: {
  readonly id: string;
  readonly body?: string;
  readonly data: ReviewEntry['data'];
}): ReviewEntry => ({
  id: input.id,
  body: input.body ?? 'Основной текст отзыва.',
  data: input.data
});

describe('reviews data', () => {
  it.each([
    { body: 'До. Точная цитата. После.', excerpt: 'Точная цитата.' },
    { body: 'До. Точная\n\nцитата. После.', excerpt: 'Точная  \tцитата.' },
    { body: 'До. Точная\u00a0цитата. После.', excerpt: 'Точная\nцитата.' },
    { body: 'До. Точная цитата. После.', excerpt: 'Точная\u00a0цитата.' },
    {
      body: 'До. [Точная](/kb/) **цитата**. После.',
      excerpt: 'Точная цитата.'
    }
  ])('maps a verbatim readable excerpt: $body', ({ body, excerpt }) => {
    const data = buildReviewsDataset([
      entry({
        id: '2026-06-25-with-excerpt',
        body,
        data: {
          published_at: '2026-06-25',
          slug: 'with-excerpt',
          area: 'forest',
          excerpt
        }
      })
    ]);

    expect(data.reviews[0]?.excerpt).toBe(excerpt);
  });

  it.each([undefined, ' \n\u00a0 '])('does not choose a fallback excerpt for %j', (excerpt) => {
    const data = buildReviewsDataset([
      entry({
        id: '2026-06-25-no-excerpt',
        data: {
          published_at: '2026-06-25',
          slug: 'no-excerpt',
          area: 'forest',
          seo: { description: 'SEO description is not a quote.' },
          excerpt
        }
      })
    ]);

    expect(data.reviews[0]?.excerpt).toBeUndefined();
  });

  it.each([
    'Изменённая цитата.',
    'точная цитата.',
    'Точная цитата!',
    'Точная … цитата.',
    '**Точная** цитата.',
    'Только в аспекте.'
  ])('rejects an excerpt not present verbatim in the main body: %s', (excerpt) => {
    const load = () =>
      buildReviewsDataset([
        entry({
          id: '2026-06-25-invalid-excerpt',
          body: 'Точная цитата.',
          data: {
            published_at: '2026-06-25',
            slug: 'invalid-excerpt',
            area: 'forest',
            excerpt,
            aspects: [{ type: 'place', body: 'Только в аспекте.' }]
          }
        })
      ]);

    expect(load).toThrow(z.ZodError);
    expect(load).toThrow(
      expect.objectContaining({
        issues: [
          {
            code: 'custom',
            path: ['excerpt'],
            message:
              'review "2026-06-25-invalid-excerpt" excerpt must occur in the readable main body'
          }
        ]
      })
    );
  });

  it('matches expanded mentions without adding mention refs or ratings', () => {
    const mentionRegistry = createSiteMentionRegistry([
      createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин')
    ]);
    const source = entry({
      id: '2026-06-25-mention-excerpt',
      body: 'Рядом @kschemelinin. Основной текст.',
      data: {
        published_at: '2026-06-25',
        slug: 'mention-excerpt',
        area: 'forest',
        aspects: [{ type: 'management', rating: 2 }]
      }
    });
    const baseline = buildReviewsDataset([source], { mentionRegistry }).reviews[0]!;
    const selected = buildReviewsDataset(
      [{ ...source, data: { ...source.data, excerpt: 'Рядом Кирилл Щемелинин.' } }],
      { mentionRegistry }
    ).reviews[0]!;

    expect(selected.excerpt).toBe('Рядом Кирилл Щемелинин.');
    expect({ body: selected.body, mentions: selected.mentions, aspects: selected.aspects }).toEqual(
      {
        body: baseline.body,
        mentions: baseline.mentions,
        aspects: baseline.aspects
      }
    );
    expect(createReviewMentionRefs(selected)).toEqual(createReviewMentionRefs(baseline));
  });

  it('accepts an empty launch dataset', () => {
    const data = buildReviewsDataset([]);

    expect(data.reviews).toEqual([]);
    expect(data.byId.size).toBe(0);
  });

  it('maps raw review entries to readonly camelCase domain reviews sorted newest first', () => {
    const data = buildReviewsDataset([
      entry({
        id: '2026-06-24-older-review',
        data: {
          published_at: '2026-06-24',
          slug: 'older-review',
          area: 'river'
        }
      }),
      entry({
        id: '2026-06-25-life-in-shelkovo-forest',
        data: {
          published_at: '2026-06-25',
          slug: 'life-in-shelkovo-forest',
          area: 'forest',
          title: 'Год жизни в Шелково',
          aspects: [
            { type: 'place', rating: 5, body: 'Лес, пруды и тишина.' },
            { type: 'management', rating: 2 }
          ]
        }
      })
    ]);

    expect(data.reviews.map((item) => item.id)).toEqual([
      '2026-06-25-life-in-shelkovo-forest',
      '2026-06-24-older-review'
    ]);
    expect(data.byId.get('2026-06-25-life-in-shelkovo-forest')).toMatchObject({
      slug: 'life-in-shelkovo-forest',
      title: 'Год жизни в Шелково',
      area: 'forest',
      publishedIso: '2026-06-25',
      url: '/reviews/2026-06-25-life-in-shelkovo-forest/',
      markdownUrl: '/reviews/2026-06-25-life-in-shelkovo-forest/index.md',
      canonical: 'https://example.com/reviews/2026-06-25-life-in-shelkovo-forest/',
      aspects: [
        { type: 'place', rating: 5, body: 'Лес, пруды и тишина.' },
        { type: 'management', rating: 2 }
      ]
    });
  });

  it('loads normalized body mentions and deduplicated graph refs', async () => {
    const mentionRegistry = createSiteMentionRegistry([
      createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин'),
      createPlaceMentionTarget('apple-garden', 'Яблоневый сад')
    ]);
    mocks.getCollection.mockResolvedValue([
      entry({
        id: '2026-06-25-with-mentions',
        body: 'Основной текст отзыва с @kschemelinin.',
        data: {
          published_at: '2026-06-25',
          slug: 'with-mentions',
          area: 'forest',
          aspects: [
            {
              type: 'place',
              rating: 5,
              body: 'Рядом [яблоневый сад](@apple-garden), его рекомендовал @kschemelinin.'
            }
          ]
        }
      })
    ]);
    mocks.loadSiteMentionRegistry.mockResolvedValue(mentionRegistry);

    const data = await loadReviewsData();
    const review = data.reviews[0];

    expect(mocks.loadSiteMentionRegistry).toHaveBeenCalledOnce();
    expect({
      body: review?.body,
      aspects: review?.aspects,
      refs: data.reviews.flatMap(createReviewMentionRefs).map(({ target }) => target)
    }).toMatchInlineSnapshot(`
      {
        "aspects": [
          {
            "body": "Рядом [яблоневый сад](/map/apple-garden/), его рекомендовал [Кирилл Щемелинин](/people/kschemelinin/).",
            "rating": 5,
            "type": "place",
          },
        ],
        "body": "Основной текст отзыва с [Кирилл Щемелинин](/people/kschemelinin/).",
        "refs": [
          {
            "slug": "kschemelinin",
            "type": "person",
          },
          {
            "slug": "apple-garden",
            "type": "place",
          },
        ],
      }
    `);
  });

  it('fails when entry id does not match published_at and slug', () => {
    expect(() =>
      buildReviewsDataset([
        entry({
          id: '2026-06-25-wrong-id',
          data: {
            published_at: '2026-06-25',
            slug: 'real-slug',
            area: 'forest'
          }
        })
      ])
    ).toThrow('review "2026-06-25-wrong-id" id must equal "2026-06-25-real-slug"');
  });

  it('fails on blank markdown body', () => {
    expect(() =>
      buildReviewsDataset([
        entry({
          id: '2026-06-25-blank-body',
          body: '   ',
          data: {
            published_at: '2026-06-25',
            slug: 'blank-body',
            area: 'park'
          }
        })
      ])
    ).toThrow('review "2026-06-25-blank-body" body is required');
  });
});

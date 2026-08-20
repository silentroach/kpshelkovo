import { beforeAll, describe, expect, it } from 'vitest';

import type { Review } from '../types';

let reviewPageSchema: typeof import('../seo').reviewPageSchema;
let reviewsCollectionPageSchema: typeof import('../seo').reviewsCollectionPageSchema;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ reviewPageSchema, reviewsCollectionPageSchema } = await import('../seo'));
});

const review = {
  id: '2026-06-25-life-in-shelkovo-forest',
  slug: 'life-in-shelkovo-forest',
  title: 'Год жизни в Шелково',
  author: 'Алексей',
  area: 'forest',
  publishedAt: new Date('2026-06-25T00:00:00.000Z'),
  publishedIso: '2026-06-25',
  url: '/reviews/2026-06-25-life-in-shelkovo-forest/',
  markdownUrl: '/reviews/2026-06-25-life-in-shelkovo-forest/index.md',
  canonical: 'https://example.com/reviews/2026-06-25-life-in-shelkovo-forest/',
  body: 'Основной **текст** отзыва.\n\nВторой абзац.',
  aspects: [
    { type: 'place', rating: 5 },
    { type: 'developer', rating: 3, body: 'Дороги еще строят.' },
    { type: 'management', rating: 2 },
  ],
  mentions: [],
} satisfies Review;

describe('reviews schema', () => {
  it('connects the collection, item list, and review entities', () => {
    const schema = reviewsCollectionPageSchema({
      name: 'Отзывы собственников',
      description: 'Отзывы текущих собственников.',
      url: '/reviews/',
      items: [review],
      breadcrumbs: [
        { name: 'Главная', url: '/' },
        { name: 'Отзывы', url: '/reviews/' },
      ],
    });

    expect(schema).toMatchSnapshot();
  });

  it('publishes the page and full review without AggregateRating', () => {
    const schema = reviewPageSchema({
      review,
      description: 'Отзыв Алексея о жизни в Шелково.',
      breadcrumbs: [
        { name: 'Главная', url: '/' },
        { name: 'Отзывы', url: '/reviews/' },
        { name: 'Год жизни в Шелково', url: review.url },
      ],
    });

    expect(schema).toMatchSnapshot();
  });

  it('publishes one supported organization and rating per review aspect', () => {
    const schema = reviewPageSchema({
      review,
      description: 'Отзыв Алексея о жизни в Шелково.',
    });
    const reviews = schema.filter((item) => item['@type'] === 'Review');

    expect(
      reviews.map((item) => ({
        id: item['@id'],
        itemReviewed: item.itemReviewed,
        reviewRating: item.reviewRating,
      })),
    ).toMatchInlineSnapshot(`
      [
        {
          "id": "https://example.com/reviews/2026-06-25-life-in-shelkovo-forest/#review-developer",
          "itemReviewed": {
            "@type": "Organization",
            "name": "Земля МО",
          },
          "reviewRating": {
            "@type": "Rating",
            "bestRating": 5,
            "ratingValue": 3,
            "worstRating": 1,
          },
        },
        {
          "id": "https://example.com/reviews/2026-06-25-life-in-shelkovo-forest/#review-management",
          "itemReviewed": {
            "@type": "Organization",
            "name": "ОК Комфорт",
          },
          "reviewRating": {
            "@type": "Rating",
            "bestRating": 5,
            "ratingValue": 2,
            "worstRating": 1,
          },
        },
      ]
    `);
  });
});

import { describe, expect, it } from 'vitest';

import type { Review } from '../types';
import {
  formatReviewArea,
  formatReviewAspectLabel,
  formatReviewAspectType,
  formatReviewAuthor,
  formatReviewDate,
  formatReviewTitle,
  sortReviewAspects,
} from '../view';

const review: Review = {
  id: '2026-06-25-life-in-shelkovo-forest',
  slug: 'life-in-shelkovo-forest',
  area: 'forest',
  publishedAt: new Date('2026-06-25T00:00:00.000Z'),
  publishedIso: '2026-06-25',
  url: '/reviews/2026-06-25-life-in-shelkovo-forest/',
  markdownUrl: '/reviews/2026-06-25-life-in-shelkovo-forest/index.md',
  canonical:
    'https://kpshelkovo.online/reviews/2026-06-25-life-in-shelkovo-forest/',
  body: 'Основной текст отзыва.',
  aspects: [],
  mentions: [],
};

describe('review view helpers', () => {
  it('formats fallback title, fallback author, date, and area', () => {
    expect(formatReviewTitle(review)).toBe(
      'Отзыв собственника от 25 июня 2026',
    );
    expect(formatReviewAuthor(review)).toBe('Анонимный собственник');
    expect(formatReviewDate(review)).toBe('25 июня 2026');
    expect(formatReviewArea(review.area)).toBe('Шелково Форест');
  });

  it('keeps aspect labels and fixed display order stable', () => {
    expect(formatReviewAspectType('place')).toBe('Место и среда');
    expect(formatReviewAspectType('developer')).toBe('Застройщик');
    expect(formatReviewAspectType('management')).toBe('Обслуживание');
    expect(formatReviewAspectLabel('place')).toBe('Место и среда');
    expect(formatReviewAspectLabel('developer')).toBe('Застройщик');
    expect(formatReviewAspectLabel('management')).toBe('Обслуживание');
    expect(
      sortReviewAspects([
        { type: 'management', rating: 2 },
        { type: 'place', rating: 5 },
        { type: 'developer', rating: 3 },
      ]).map((item) => item.type),
    ).toEqual(['place', 'developer', 'management']);
  });
});

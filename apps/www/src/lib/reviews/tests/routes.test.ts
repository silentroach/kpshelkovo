import { describe, expect, it } from 'vitest';

import {
  reviewCanonical,
  reviewMarkdownPattern,
  reviewMarkdownUrl,
  reviewPattern,
  reviewUrl,
  reviewsMarkdownUrl,
  reviewsRulesMarkdownUrl,
  reviewsRulesUrl,
  reviewsUrl
} from '../routes';

describe('review routes', () => {
  it('builds stable index, rules, and detail URLs', () => {
    const review = { id: '2026-06-25-life-in-shelkovo-forest' };

    expect(reviewsUrl()).toBe('/reviews/');
    expect(reviewsMarkdownUrl()).toBe('/reviews/index.md');
    expect(reviewsRulesUrl()).toBe('/reviews/rules/');
    expect(reviewsRulesMarkdownUrl()).toBe('/reviews/rules/index.md');
    expect(reviewUrl(review)).toBe('/reviews/2026-06-25-life-in-shelkovo-forest/');
    expect(reviewMarkdownUrl(review)).toBe('/reviews/2026-06-25-life-in-shelkovo-forest/index.md');
    expect(reviewCanonical(review)).toBe(
      'https://kpshelkovo.online/reviews/2026-06-25-life-in-shelkovo-forest/'
    );
  });

  it('rejects malformed review ids before building public URLs', () => {
    expect(() => reviewUrl({ id: 'life-in-shelkovo-forest' })).toThrow(/review id/u);
  });

  it('exposes route patterns for public surface registration', () => {
    expect(reviewPattern()).toBe('/reviews/:id/');
    expect(reviewMarkdownPattern()).toBe('/reviews/:id/index.md');
  });
});

import { describe, expect, it } from 'vitest';

import {
  placeCanonical,
  placeHighlightUrl,
  placeMarkdownPattern,
  placeMarkdownUrl,
  placePattern,
  placesMarkdownUrl,
  placesUrl,
  placeUrl,
} from '../routes';

describe('place routes', () => {
  it('builds stable section and detail URLs', () => {
    expect(placesUrl()).toBe('/map/');
    expect(placeHighlightUrl('titanic')).toBe('/map/?h=titanic');
    expect(placesMarkdownUrl()).toBe('/map/index.md');
    expect(placeUrl('burzhuyka')).toBe('/map/burzhuyka/');
    expect(placeMarkdownUrl('burzhuyka')).toBe('/map/burzhuyka/index.md');
    expect(placeCanonical('burzhuyka')).toBe(
      'https://kpshelkovo.online/map/burzhuyka/',
    );
  });

  it('rejects malformed slugs', () => {
    expect(() => placeUrl('Bad Slug')).toThrow(/place slug/u);
    expect(() => placeHighlightUrl('Bad Slug')).toThrow(/place slug/u);
  });

  it('exposes route patterns for public surface registration', () => {
    expect(placePattern()).toBe('/map/:slug/');
    expect(placeMarkdownPattern()).toBe('/map/:slug/index.md');
  });
});

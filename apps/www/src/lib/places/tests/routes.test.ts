import { describe, expect, it } from 'vitest';

import {
  placeCanonical,
  placeMarkdownPattern,
  placeMarkdownUrl,
  placePattern,
  placesMarkdownUrl,
  placesUrl,
  placeUrl,
} from '../routes';

describe('place routes', () => {
  it('builds stable section and detail URLs', () => {
    expect(placesUrl()).toBe('/places/');
    expect(placesMarkdownUrl()).toBe('/places/index.md');
    expect(placeUrl('burzhuyka')).toBe('/places/burzhuyka/');
    expect(placeMarkdownUrl('burzhuyka')).toBe('/places/burzhuyka/index.md');
    expect(placeCanonical('burzhuyka')).toBe(
      'https://kpshelkovo.online/places/burzhuyka/',
    );
  });

  it('rejects malformed slugs', () => {
    expect(() => placeUrl('Bad Slug')).toThrow(/place slug/u);
  });

  it('exposes route patterns for public surface registration', () => {
    expect(placePattern()).toBe('/places/:slug/');
    expect(placeMarkdownPattern()).toBe('/places/:slug/index.md');
  });
});

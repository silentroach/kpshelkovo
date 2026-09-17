import * as geo from '@shelkovo/geo';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getNearbyPlaces } from '@/lib/places/nearby';

import { testPlace } from './place.test-helper';

afterEach(() => vi.restoreAllMocks());

describe('getNearbyPlaces', () => {
  it('selects the three nearest visible places without reordering the input', () => {
    const place = testPlace({ showOnMap: true });
    const places = Object.freeze([
      testPlace({ slug: 'fourth', showOnMap: true, coordinates: { lat: 55.008, lng: 38 } }),
      testPlace({ slug: 'third', showOnMap: true, coordinates: { lat: 55.006, lng: 38 } }),
      testPlace({ slug: 'hidden', showOnMap: false }),
      testPlace({ slug: place.slug, showOnMap: true }),
      testPlace({ slug: 'second', showOnMap: true, coordinates: { lat: 55.004, lng: 38 } }),
      testPlace({ slug: 'first', showOnMap: true, coordinates: { lat: 55.002, lng: 38 } })
    ]);

    expect(getNearbyPlaces(place, places).map(({ slug }) => slug)).toMatchInlineSnapshot(`
      [
        "first",
        "second",
        "third",
      ]
    `);
  });

  it('keeps coincident places in slug order even when the source is hidden', () => {
    const place = testPlace({ showOnMap: false });
    const places = [
      testPlace({ slug: 'zebra', showOnMap: true }),
      testPlace({ slug: place.slug, showOnMap: true }),
      testPlace({ slug: 'hidden', showOnMap: false }),
      testPlace({ slug: 'alpha', showOnMap: true })
    ];

    expect(getNearbyPlaces(place, places).map(({ slug }) => slug)).toMatchInlineSnapshot(`
      [
        "alpha",
        "zebra",
      ]
    `);
  });

  it('returns no neighbors when all other visible places are beyond one kilometer', () => {
    const place = testPlace();
    const places = [
      place,
      testPlace({ slug: 'hidden', showOnMap: false }),
      testPlace({ slug: 'north', showOnMap: true, coordinates: { lat: 55.01, lng: 38 } }),
      testPlace({ slug: 'east', showOnMap: true, coordinates: { lat: 55, lng: 38.02 } })
    ];

    expect(getNearbyPlaces(place, places)).toEqual([]);
    expect(getNearbyPlaces(place, [])).toEqual([]);
  });

  it('includes exactly one kilometer but excludes anything farther without rounding', () => {
    vi.spyOn(geo, 'calculateDistance').mockReturnValueOnce(1).mockReturnValueOnce(1.000001);
    const boundary = testPlace({ slug: 'boundary', showOnMap: true });
    const outside = testPlace({ slug: 'outside', showOnMap: true });

    expect(getNearbyPlaces(testPlace(), [boundary, outside])).toEqual([boundary]);
  });
});

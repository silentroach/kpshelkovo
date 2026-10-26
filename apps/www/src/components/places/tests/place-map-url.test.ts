import { describe, expect, it } from 'vitest';

import { getInitialMapLayers, getUrlWithoutPlaceHighlight } from '../place-map-url';

describe('place map URL', () => {
  it.each(['infra', 'shr', 'shf', 'shp', 'shv'])(
    'selects the single requested layer %s',
    (layer) => {
      expect(getInitialMapLayers(new URLSearchParams({ l: layer }))).toEqual([layer]);
    }
  );

  it('unions repeated lists and expands all parcels without rewriting the query', () => {
    const url = new URL(
      'https://kpshelkovo.online/map/?flag&l=shf,,unknown&l=parcels,infra,shf#map'
    );
    const href = url.href;
    expect(getInitialMapLayers(url.searchParams)).toMatchInlineSnapshot(`
      [
        "shr",
        "shf",
        "shp",
        "shv",
        "infra",
      ]
    `);
    expect(url.href).toBe(href);
  });

  it.each(['', 'l=', 'l=unknown,,&l=infrastructure', 'l=INFRA,SHF'])(
    'keeps defaults for an unrecognized query %s',
    (query) => {
      expect(getInitialMapLayers(new URLSearchParams(query))).toEqual([]);
    }
  );

  it('removes every highlight parameter without normalizing the remaining URL', () => {
    expect(
      getUrlWithoutPlaceHighlight(
        'https://kpshelkovo.online/map/?q=a%20b&flag&h=titanic&h=ponds#map',
        'titanic'
      )
    ).toBe('/map/?q=a%20b&flag#map');
  });

  it('leaves the URL unchanged when another place is highlighted', () => {
    expect(
      getUrlWithoutPlaceHighlight('https://kpshelkovo.online/map/?h=titanic&from=issue', 'ponds')
    ).toBeUndefined();
  });

  it('removes an empty highlight while preserving malformed parameter names', () => {
    expect(
      getUrlWithoutPlaceHighlight('https://kpshelkovo.online/map/?%=value&h=&from=issue')
    ).toBe('/map/?%=value&from=issue');
  });
});

import { describe, expect, it } from 'vitest';

import { getUrlWithoutPlaceHighlight } from '../place-map-url';

describe('place map URL', () => {
  it('removes every highlight parameter without normalizing the remaining URL', () => {
    expect(
      getUrlWithoutPlaceHighlight(
        'https://kpshelkovo.online/map/?q=a%20b&flag&h=titanic&h=ponds#map',
        'titanic',
      ),
    ).toBe('/map/?q=a%20b&flag#map');
  });

  it('leaves the URL unchanged when another place is highlighted', () => {
    expect(
      getUrlWithoutPlaceHighlight(
        'https://kpshelkovo.online/map/?h=titanic&from=issue',
        'ponds',
      ),
    ).toBeUndefined();
  });

  it('removes an empty highlight while preserving malformed parameter names', () => {
    expect(
      getUrlWithoutPlaceHighlight(
        'https://kpshelkovo.online/map/?%=value&h=&from=issue',
      ),
    ).toBe('/map/?%=value&from=issue');
  });
});

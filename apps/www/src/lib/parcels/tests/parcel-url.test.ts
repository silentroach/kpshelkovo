import { describe, expect, it } from 'vitest';

import { getParcelUrl, getUrlWithoutParcel } from '../parcel-url';

describe('parcel links', () => {
  it('creates a link only for full canonical code and removes p without changing other URL parts', () => {
    expect(getParcelUrl('SHR-L43')).toBe('/map/?p=SHR-L43');
    expect(() => getParcelUrl('L43')).toThrow();

    expect(
      getUrlWithoutParcel('https://example.test/map/?q=a%20b&flag&p=shr-l44&h=pond#map', 'shr-l44')
    ).toBe('/map/?q=a%20b&flag&h=pond#map');
    expect(getUrlWithoutParcel('https://example.test/map/?p=SHR-L43', 'SHR-L44')).toBeUndefined();
  });
});

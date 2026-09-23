import { describe, expect, it } from 'vitest';

import { getUrlWithoutParcel } from '../parcel-url';

describe('parcel links', () => {
  it('removes p without changing other URL parts', () => {
    expect(
      getUrlWithoutParcel('https://example.test/map/?q=a%20b&flag&p=shr-l44&h=pond#map', 'shr-l44')
    ).toBe('/map/?q=a%20b&flag&h=pond#map');
    expect(getUrlWithoutParcel('https://example.test/map/?p=SHR-L43', 'SHR-L44')).toBeUndefined();
  });
});

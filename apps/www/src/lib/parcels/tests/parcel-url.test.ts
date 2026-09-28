import { describe, expect, it } from 'vitest';

import { getUrlWithParcel, getUrlWithoutParcel } from '../parcel-url';

describe('parcel links', () => {
  it('removes p without changing other URL parts', () => {
    expect(
      getUrlWithoutParcel('https://example.test/map/?q=a%20b&flag&p=shr-l44&h=pond#map', 'shr-l44')
    ).toBe('/map/?q=a%20b&flag&h=pond#map');
    expect(getUrlWithoutParcel('https://example.test/map/?p=SHR-L43', 'SHR-L44')).toBeUndefined();
  });

  it('sets a parcel code while preserving raw unrelated parameters and the hash', () => {
    expect(getUrlWithParcel('https://example.test/map/?q=a%20b&flag&h=pond#map', 'SHR-L43')).toBe(
      '/map/?q=a%20b&flag&h=pond&p=SHR-L43#map'
    );
    expect(getUrlWithParcel('https://example.test/map/#map', 'SHR-L43')).toBe(
      '/map/?p=SHR-L43#map'
    );
  });

  it('replaces every existing parcel parameter, including encoded parameter names', () => {
    expect(
      getUrlWithParcel('https://example.test/map/?p=shr-l44&flag&%70=OLD&x=a+b#map', 'SHR-L43')
    ).toBe('/map/?flag&x=a+b&p=SHR-L43#map');
    expect(
      getUrlWithoutParcel('https://example.test/map/?p=SHR-L43&flag&%70=OLD#map', 'SHR-L43')
    ).toBe('/map/?flag#map');
  });
});

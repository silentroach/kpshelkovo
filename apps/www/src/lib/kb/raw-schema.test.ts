import { describe, expect, it } from 'vitest';

import { RawKbPageSchema } from './raw-schema';

describe('RawKbPageSchema', () => {
  it('accepts supported page flags', () => {
    expect(
      RawKbPageSchema.parse({
        title: 'Служебная статья',
        flags: ['exclude-from-site-search', 'noindex'],
      }),
    ).toEqual({
      title: 'Служебная статья',
      flags: ['exclude-from-site-search', 'noindex'],
    });
  });

  it('rejects unknown page flags', () => {
    expect(() =>
      RawKbPageSchema.parse({
        title: 'Служебная статья',
        flags: ['draft'],
      }),
    ).toThrow();
  });
});

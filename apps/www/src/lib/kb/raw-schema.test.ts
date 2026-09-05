import { describe, expect, it } from 'vitest';

import { KB_PAGE_FLAGS } from './page-flags';
import { RawKbPageSchema } from './raw-schema';

describe('RawKbPageSchema', () => {
  it('accepts supported page flags', () => {
    expect(
      RawKbPageSchema.parse({
        title: 'Служебная статья',
        flags: KB_PAGE_FLAGS,
      }),
    ).toEqual({
      title: 'Служебная статья',
      flags: KB_PAGE_FLAGS,
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

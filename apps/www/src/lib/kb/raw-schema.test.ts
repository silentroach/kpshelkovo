import { describe, expect, it } from 'vitest';

import { RawKbPageSchema } from './raw-schema';
import { KB_PAGE_FLAGS } from './types';

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

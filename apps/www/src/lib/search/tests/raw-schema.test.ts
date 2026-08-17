import { describe, expect, it } from 'vitest';

import { RawSearchAliasesSchema } from '../raw-schema';

describe('RawSearchAliasesSchema', () => {
  it('rejects aliases duplicated after normalization', () => {
    expect(
      RawSearchAliasesSchema.safeParse(['Где поесть', '  где   поесть  '])
        .success,
    ).toBe(false);
  });
});

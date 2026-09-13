import { describe, expect, it } from 'vitest';

import { personSourceId } from '../source';

describe('personSourceId', () => {
  it('preserves the filename slug', () => {
    expect(personSourceId('person-2.md')).toBe('person-2');
  });

  it.each([
    ['nested/Bad_slug.md', 'must live directly under src/data/people'],
    ['Bad_slug.md', 'slug must use lower-case Latin letters, digits, and hyphen'],
    ['.md', 'slug must use lower-case Latin letters, digits, and hyphen']
  ])('rejects %s in path/slug order', (entry, reason) => {
    expect(() => personSourceId(entry)).toThrow(`person profile path "${entry}" ${reason}`);
  });
});

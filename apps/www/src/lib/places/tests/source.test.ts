import { describe, expect, it } from 'vitest';

import { placeSourceId } from '../source';

describe('placeSourceId', () => {
  it('preserves the filename slug', () => {
    expect(placeSourceId('park-2.md')).toBe('park-2');
  });

  it.each([
    ['nested/Bad_slug.md', 'must be a Markdown file directly under src/data/places'],
    ['Bad_slug.yaml', 'must be a Markdown file directly under src/data/places'],
    ['park.MD', 'must be a Markdown file directly under src/data/places'],
    ['Bad_slug.md', 'slug must use lower-case Latin letters, digits, and hyphen'],
    ['.md', 'slug must use lower-case Latin letters, digits, and hyphen']
  ])('rejects %s in path/slug order', (entry, reason) => {
    expect(() => placeSourceId(entry)).toThrow(`place path "${entry}" ${reason}`);
  });
});

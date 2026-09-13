import { describe, expect, it } from 'vitest';

import { contactSourceId } from '../source';

describe('contactSourceId', () => {
  it('uses frontmatter identity independently of the source path', () => {
    expect(contactSourceId('old-folder/draft.md', { category: 'food', slug: 'bakery-2' })).toBe(
      'food/bakery-2'
    );
  });

  it('keeps numeric slug coercion at the loader boundary', () => {
    expect(contactSourceId('contact.md', { category: 'food', slug: 815 })).toBe('food/815');
  });

  it.each([
    ['contact.yaml', {}, 'must be a Markdown file'],
    ['contact.md', undefined, 'must define slug'],
    ['contact.md', [], 'must define slug'],
    ['contact.md', {}, 'must define slug'],
    ['contact.md', { category: 'unknown', slug: '' }, 'must define slug'],
    ['contact.md', { slug: 'Bad_slug' }, 'must define category'],
    [
      'contact.md',
      { slug: 'Bad_slug', category: 'unknown' },
      'slug must use lower-case Latin letters, digits, and hyphen'
    ],
    ['contact.md', { slug: 'bakery', category: 'unknown' }, 'category "unknown" is unknown']
  ])(
    'rejects invalid identity in extension/required/format/category order: %j %j',
    (entry, data, reason) => {
      expect(() => contactSourceId(entry, data)).toThrow(`contact path "${entry}" ${reason}`);
    }
  );
});

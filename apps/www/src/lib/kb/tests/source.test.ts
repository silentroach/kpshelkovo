import { describe, expect, it } from 'vitest';

import { kbPageSourceId } from '../source';

describe('kbPageSourceId', () => {
  it.each([
    ['index.md', 'index'],
    ['services/internet.md', 'services/internet'],
    ['services/internet/index.md', 'services/internet/index']
  ])('preserves source ID rather than collapsing route aliases: %s', (entry, id) => {
    expect(kbPageSourceId(entry)).toBe(id);
  });

  it.each(['.md', '/index.md', 'Bad//index.md', 'services/.md'])(
    'rejects empty segments before invalid slugs: %s',
    (entry) => {
      expect(() => kbPageSourceId(entry)).toThrow(
        `kb page path "${entry}" must not contain empty path segments`
      );
    }
  );

  it('reports the first invalid route segment', () => {
    expect(() =>
      kbPageSourceId('services/Bad_slug/Also_bad/index.md')
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: kb page path "services/Bad_slug/Also_bad/index.md" segment "Bad_slug" must use lower-case Latin letters, digits, and hyphen]`
    );
  });
});

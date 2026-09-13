import { describe, expect, it, vi } from 'vitest';

import { statusSourceId } from '../source';

describe('statusSourceId', () => {
  it.each(['', 'Restored service'])('allows empty or meaningful body', (body) => {
    expect(
      statusSourceId('2026/09/outage.md', { started_at: '07.09.2026 12:00' }, () => body)
    ).toBe('2026/09/outage');
  });

  it.each([
    ['2026/outage.md', 'must resolve to YYYY/MM/[slug]'],
    ['2026/13/Bad_slug.md', 'must use YYYY/MM/[slug] with numeric year and month'],
    ['2026/09/.md', 'must use YYYY/MM/[slug] with numeric year and month'],
    ['2026/09/Bad_slug.md', 'slug must use lower-case Latin letters, digits, and hyphen'],
    ['2026/09/outage.md', 'must match the frontmatter started_at year and month']
  ])('rejects %s before reading body', (entry, reason) => {
    const readBody = vi.fn(() => ' \n');
    expect(() => statusSourceId(entry, { started_at: '07.08.2025 12:00' }, readBody)).toThrow(
      `status incident path "${entry}" ${reason}`
    );
    expect(readBody).not.toHaveBeenCalled();
  });

  it.each([undefined, {}, { started_at: 'invalid' }])(
    'leaves invalid or missing started_at to the collection schema',
    (data) => {
      expect(statusSourceId('2026/09/outage.md', data, () => '')).toBe('2026/09/outage');
    }
  );

  it.each(['07.09.2025 12:00', '07.08.2026 12:00'])(
    'rejects a different start year or month: %s',
    (started_at) => {
      expect(() =>
        statusSourceId('2026/09/outage.md', { started_at }, () => '')
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: status incident path "2026/09/outage.md" must match the frontmatter started_at year and month]`
      );
    }
  );

  it('rejects whitespace-only body after accepting the date', () => {
    expect(() =>
      statusSourceId('2026/09/outage.md', { started_at: new Date('2026-09-07') }, () => ' \n\t')
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: status incident path "2026/09/outage.md" body must not be blank]`
    );
  });
});

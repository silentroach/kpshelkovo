import { describe, expect, it, vi } from 'vitest';

import { articleSourceId, newsArchiveSummaryId } from '../source';

describe('articleSourceId', () => {
  it.each([
    ['2026/09/7.md', '07.09.2026', '2026/09/7'],
    ['2026/09/07/index.md', '2026-09-07', '2026/09/07'],
    ['2026/09/report/INDEX.MD', new Date('2026-09-07'), '2026/09/report']
  ])('keeps the source ID for %s', (entry, date, id) => {
    expect(articleSourceId(entry, { date })).toBe(id);
  });

  it.each([
    ['2026/report.md', '2025-01-01', 'must resolve to YYYY/MM/[entry]'],
    ['2026/13/report.md', '2025-01-01', 'must use YYYY/MM/[entry] with numeric year and month'],
    ['2026/09/.md', '2026-09-07', 'must use YYYY/MM/[entry] with numeric year and month'],
    ['2026/09/report.md', '2025-09-07', 'must match the frontmatter date year and month'],
    ['2026/09/report.md', '2026-08-07', 'must match the frontmatter date year and month'],
    ['2026/09/32.md', '2025-08-01', 'must match the frontmatter date year and month'],
    ['2026/09/00.md', '2026-09-07', 'numeric day keys must be valid calendar days'],
    ['2026/09/32.md', '2026-09-07', 'numeric day keys must be valid calendar days'],
    ['2026/09/007.md', '2026-09-07', 'numeric day keys must be valid calendar days'],
    [
      '2026/09/08/index.md',
      '07.09.2026 12:00',
      'numeric day keys must match the frontmatter date day'
    ]
  ])('rejects %s in path/date/day validation order', (entry, date, reason) => {
    expect(() => articleSourceId(entry, { date })).toThrow(
      `news article path "${entry}" ${reason}`
    );
  });

  it.each([undefined, {}, { date: 'invalid' }, { date: '2026-02-30' }])(
    'leaves missing or invalid dates to the collection schema',
    (data) => {
      expect(articleSourceId('2026/09/07.md', data)).toBe('2026/09/07');
    }
  );
});

describe('newsArchiveSummaryId', () => {
  it.each([
    ['2026/index.md', '2026'],
    ['2026/09.md', '2026/09']
  ])('keeps the archive ID for %s', (entry, id) => {
    expect(newsArchiveSummaryId(entry, () => 'Archive summary')).toBe(id);
  });

  it.each([
    ['2026/index.yaml', 'must be a Markdown file'],
    ['2026/9.md', 'must use YYYY/index.md or YYYY/MM.md'],
    ['2026/00.md', 'must use YYYY/index.md or YYYY/MM.md'],
    ['2026/13.md', 'must use YYYY/index.md or YYYY/MM.md'],
    ['2026/09/index.md', 'must use YYYY/index.md or YYYY/MM.md']
  ])('rejects %s before reading the file', (entry, reason) => {
    const readBody = vi.fn(() => '');
    expect(() => newsArchiveSummaryId(entry, readBody)).toThrow(
      `news archive summary path "${entry}" ${reason}`
    );
    expect(readBody).not.toHaveBeenCalled();
  });

  it.each(['', ' \n\t'])('requires non-blank body', (body) => {
    expect(() => newsArchiveSummaryId('2026/09.md', () => body)).toThrowErrorMatchingInlineSnapshot(
      `[Error: news archive summary path "2026/09.md" body is required]`
    );
  });
});

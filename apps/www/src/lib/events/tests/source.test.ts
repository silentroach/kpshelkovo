import { describe, expect, it, vi } from 'vitest';

import { eventSourceId } from '../source';

describe('event source folders', () => {
  it.each(['2026-10-01', '01.10.2026 00:30'])(
    'uses the Moscow start month for %s and retains the full collection key',
    (starts_at) => {
      expect(eventSourceId('2026/10/meeting.md', { starts_at }, () => 'Описание')).toBe(
        '2026/10/meeting'
      );
    }
  );

  it.each(['meeting.md', '2026/meeting.md', '2026/09/extra/meeting.md'])(
    'rejects a misplaced source %s before reading its body',
    (path) => {
      const readBody = vi.fn(() => 'Описание');
      expect(() => eventSourceId(path, { starts_at: '15.09.2026' }, readBody)).toThrow(
        `event source "${path}" must use YYYY/MM/<event-id>.md`
      );
      expect(readBody).not.toHaveBeenCalled();
    }
  );

  it.each(['2025/09/meeting.md', '2026/08/meeting.md'])(
    'rejects a source outside its start month: %s',
    (path) => {
      expect(() => eventSourceId(path, { starts_at: '15.09.2026' }, () => 'Описание')).toThrow(
        `event source "${path}" must match the frontmatter starts_at year and month`
      );
    }
  );

  it('stores a period crossing the year only in its start month', () => {
    expect(
      eventSourceId(
        '2026/12/exhibition.md',
        { starts_at: '30.12.2026', through: '03.01.2027' },
        () => 'Описание'
      )
    ).toBe('2026/12/exhibition');
  });

  it('still requires a meaningful Markdown body', () => {
    expect(() =>
      eventSourceId('2026/09/meeting.md', { starts_at: '15.09.2026' }, () => ' \n')
    ).toThrow();
  });
});

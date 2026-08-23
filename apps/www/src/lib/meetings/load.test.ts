import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { SiteMentionRegistry } from '@/lib/mentions';

import type {
  buildMeetingsDataset as buildMeetingsDatasetType,
  loadMeeting as loadMeetingType,
  MeetingEntry,
  MeetingTranscriptEntry,
} from './load';

const mocks = vi.hoisted(() => ({
  getCollection: vi.fn(),
  loadSiteMentionRegistry: vi.fn(),
}));

vi.mock('astro:content', () => ({
  getCollection: mocks.getCollection,
}));

vi.mock('@/lib/mentions/registry', () => ({
  loadSiteMentionRegistry: mocks.loadSiteMentionRegistry,
}));

let buildMeetingsDataset: typeof buildMeetingsDatasetType;
let loadMeeting: typeof loadMeetingType;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ buildMeetingsDataset, loadMeeting } = await import('./load'));
});

const entry = (input: {
  readonly id: string;
  readonly title?: string;
  readonly date?: string;
}): MeetingEntry => ({
  id: input.id,
  data: {
    title: input.title ?? `Встреча ${input.id}`,
    date: input.date ?? '13.06.2026 16:00',
    context: 'Контекст встречи.',
    speakers: {
      moderator: {
        name: 'Модератор',
      },
    },
  },
});

const transcript = (input: {
  readonly id: string;
  readonly part?: number;
  readonly text?: string;
}): MeetingTranscriptEntry => ({
  id: `${input.id}/${input.part ?? 1}`,
  data: {
    segments: [
      {
        start: '00:00:00',
        speaker: 'moderator',
        text: input.text ?? 'Добрый день.',
      },
    ],
  },
});

const build = (
  entries: readonly MeetingEntry[],
  transcripts: readonly MeetingTranscriptEntry[],
  mentionRegistry?: SiteMentionRegistry,
) => buildMeetingsDataset(entries, transcripts, { mentionRegistry });

describe('buildMeetingsDataset', () => {
  it('joins meeting entries and transcripts by id', () => {
    const data = build(
      [entry({ id: '2026-06-13-ok-comfort' })],
      [transcript({ id: '2026-06-13-ok-comfort' })],
    );

    expect(data.meetings).toHaveLength(1);
    expect(data.bySlug.get('2026-06-13-ok-comfort')).toMatchObject({
      slug: '2026-06-13-ok-comfort',
      transcript: {
        segments: [
          {
            text: 'Добрый день.',
          },
        ],
      },
    });
  });

  it('joins multiple transcript files as parts', () => {
    const data = build(
      [entry({ id: '2026-06-13-ok-comfort' })],
      [
        transcript({ id: '2026-06-13-ok-comfort', text: 'Первая часть.' }),
        transcript({
          id: '2026-06-13-ok-comfort',
          part: 2,
          text: 'Вторая часть.',
        }),
      ],
    );

    expect(data.meetings[0]?.transcript.parts).toHaveLength(2);
    expect(
      data.meetings[0]?.transcript.segments.map((segment) => segment.anchor),
    ).toEqual(['t-00-00-00', 't-00-00-00-2']);
  });

  it('rejects a meeting entry without a matching transcript', () => {
    expect(() => build([entry({ id: 'missing-transcript' })], [])).toThrow(
      'meeting "missing-transcript" has no matching transcript',
    );
  });

  it('rejects an orphan transcript without a matching meeting entry', () => {
    expect(() => build([], [transcript({ id: 'orphan-transcript' })])).toThrow(
      'meeting transcript "orphan-transcript" has no matching entry',
    );
  });

  it('sorts meetings newest first with deterministic title fallback', () => {
    const data = build(
      [
        entry({
          id: 'same-date-beta',
          title: 'Бета',
          date: '13.06.2026 16:00',
        }),
        entry({
          id: 'newest',
          title: 'Новая',
          date: '14.06.2026',
        }),
        entry({
          id: 'same-date-alpha',
          title: 'Альфа',
          date: '13.06.2026 16:00',
        }),
      ],
      [
        transcript({ id: 'same-date-beta' }),
        transcript({ id: 'newest' }),
        transcript({ id: 'same-date-alpha' }),
      ],
    );

    expect(data.meetings.map((meeting) => meeting.slug)).toEqual([
      'newest',
      'same-date-alpha',
      'same-date-beta',
    ]);
  });
});

describe('loadMeeting', () => {
  it('trims slug and returns undefined for an empty string', async () => {
    mocks.getCollection.mockImplementation((name: string) => {
      if (name === 'meetingEntries') {
        return Promise.resolve([entry({ id: 'trimmed' })]);
      }

      if (name === 'meetingTranscripts') {
        return Promise.resolve([transcript({ id: 'trimmed' })]);
      }

      return Promise.resolve([]);
    });
    mocks.loadSiteMentionRegistry.mockResolvedValue(new Map());

    await expect(loadMeeting('   ')).resolves.toBeUndefined();
    await expect(loadMeeting(' trimmed ')).resolves.toMatchObject({
      slug: 'trimmed',
    });
  });
});

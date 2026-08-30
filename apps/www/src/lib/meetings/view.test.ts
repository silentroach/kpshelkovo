import { describe, expect, it } from 'vitest';

import type { Meeting, MeetingMoment, MeetingTranscriptTime } from './types';
import {
  describeMeeting,
  formatMeetingDate,
  formatMeetingMetaDate,
  formatMeetingSourceLabel,
  formatMeetingSpeakerAnchor,
  formatTranscriptPartLabel,
  formatTranscriptTime,
} from './view';

const moment = (input: {
  readonly iso: string;
  readonly hasTime: boolean;
}): MeetingMoment => ({
  at: new Date(input.iso),
  iso: input.iso,
  hasTime: input.hasTime,
});

const transcriptTime = (value: string): MeetingTranscriptTime => ({
  value,
  totalSeconds: 0,
});

const meeting = (input?: {
  readonly context?: string;
  readonly sourceUrls?: readonly string[];
  readonly date?: MeetingMoment;
}): Meeting => ({
  id: '2026-06-13-ok-comfort',
  slug: '2026-06-13-ok-comfort',
  title: 'Встреча ОК Комфорт с жителями КП Шелково',
  date:
    input?.date ??
    moment({
      iso: '2026-06-13T16:00:00+03:00',
      hasTime: true,
    }),
  context:
    input?.context ??
    'Встреча управляющей компании с жителями о сезонных работах, тарифе и финансовых вопросах.',
  sourceUrls: input?.sourceUrls ?? [],
  url: '/meetings/2026-06-13-ok-comfort/',
  canonical: 'https://example.com/meetings/2026-06-13-ok-comfort/',
  transcript: {
    speakers: [],
    parts: [],
    segments: [],
  },
});

describe('meeting view helpers', () => {
  it('formats visible dates with Russian style and optional time', () => {
    expect(
      formatMeetingDate(
        moment({
          iso: '2026-06-13T16:00:00+03:00',
          hasTime: true,
        }),
      ),
    ).toBe('13 июня 2026, 16:00');

    expect(
      formatMeetingDate(
        moment({
          iso: '2026-06-13T00:00:00+03:00',
          hasTime: false,
        }),
      ),
    ).toBe('13 июня 2026');
  });

  it('formats meta dates as ISO with time or date-only value', () => {
    expect(
      formatMeetingMetaDate(
        moment({
          iso: '2026-06-13T16:00:00+03:00',
          hasTime: true,
        }),
      ),
    ).toBe('2026-06-13T16:00:00+03:00');

    expect(
      formatMeetingMetaDate(
        moment({
          iso: '2026-06-13T00:00:00+03:00',
          hasTime: false,
        }),
      ),
    ).toBe('2026-06-13');
  });

  it('builds a description from meeting context and keeps it within 170 chars', () => {
    const context =
      'Встреча управляющей компании с жителями о сезонных работах, тарифе, финансовых вопросах, заявках, обслуживании поселка и дальнейшей работе с обращениями.';
    const description = describeMeeting(meeting({ context }));

    expect(description.startsWith(context.slice(0, 40))).toBe(true);
    expect(description.length).toBeLessThanOrEqual(170);

    expect(describeMeeting(meeting({ context: 'а'.repeat(200) })).length).toBe(
      170,
    );
  });

  it('adds a factual transcript phrase when context is short', () => {
    expect(
      describeMeeting(
        meeting({
          context: 'Встреча с жителями.',
          sourceUrls: ['https://example.com/source'],
        }),
      ),
    ).toBe(
      'Встреча с жителями. Полная транскрипция встречи с временными отметками и ссылкой на источник записи.',
    );
  });

  it('formats source labels for one or multiple recordings', () => {
    expect(formatMeetingSourceLabel(1, 0)).toBe('Источник записи');
    expect(formatMeetingSourceLabel(2, 0)).toBe('Источник записи 1');
    expect(formatMeetingSourceLabel(2, 1)).toBe('Источник записи 2');
  });

  it('formats transcript time and speaker anchors consistently', () => {
    expect(formatTranscriptTime(transcriptTime('00:12:34'))).toBe('00:12:34');
    expect(formatTranscriptPartLabel({ index: 2 })).toBe('Часть 2');
    expect(formatMeetingSpeakerAnchor({ id: 'ykizilov' })).toBe(
      'speaker-ykizilov',
    );
  });
});

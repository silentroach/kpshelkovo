import { dateTimeFromISO } from '@shelkovo/format';

import type {
  Meeting,
  MeetingMoment,
  MeetingSpeaker,
  MeetingTranscriptPart,
  MeetingTranscriptTime,
} from './types';

const META_DESCRIPTION_LIMIT = 170;
const SPACE = /\s+/gu;

const normalizeMetaText = (value: string): string => value.replace(SPACE, ' ');

const trimMetaDescription = (value: string): string => {
  if (value.length <= META_DESCRIPTION_LIMIT) {
    return value;
  }

  const textLimit = META_DESCRIPTION_LIMIT - 3;
  const trimmed = value.slice(0, textLimit + 1);
  const lastSpace = trimmed.lastIndexOf(' ');
  const cut =
    lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed.slice(0, textLimit);

  return `${cut.replace(/[,.!?;:]$/u, '')}...`;
};

const transcriptSourcePhrase = (meeting: Meeting): string => {
  if (meeting.sourceUrls.length === 0) {
    return 'Полная транскрипция встречи с временными отметками в архиве.';
  }

  return meeting.sourceUrls.length === 1
    ? 'Полная транскрипция встречи с временными отметками и ссылкой на источник записи.'
    : 'Полная транскрипция встречи с временными отметками и ссылками на источники записи.';
};

export const formatMeetingDate = (date: MeetingMoment): string => {
  const value = dateTimeFromISO(date.iso);
  const visibleDate = value.toFormat('d MMMM yyyy');

  return date.hasTime
    ? `${visibleDate}, ${value.toFormat('HH:mm')}`
    : visibleDate;
};

export const formatMeetingMetaDate = (date: MeetingMoment): string =>
  date.hasTime ? date.iso : date.iso.slice(0, 10);

export const describeMeeting = (meeting: Meeting): string => {
  const context = normalizeMetaText(meeting.context).trim();
  const description =
    context.length < 80
      ? `${context} ${transcriptSourcePhrase(meeting)}`
      : context;

  return trimMetaDescription(description);
};

export const formatTranscriptTime = (time: MeetingTranscriptTime): string =>
  time.value;

export const formatTranscriptPartLabel = (
  part: Pick<MeetingTranscriptPart, 'index'>,
): string => `Часть ${part.index}`;

export const formatMeetingSourceLabel = (
  sourceCount: number,
  index: number,
): string =>
  sourceCount === 1 ? 'Источник записи' : `Источник записи ${index + 1}`;

export const formatMeetingSpeakerAnchor = (
  speaker: Pick<MeetingSpeaker, 'id'>,
): string => `speaker-${speaker.id}`;

import type { SiteMentionRegistry } from '@/lib/mentions';
import {
  preprocessSiteMarkdownContent,
  renderMarkdown,
} from '@/lib/markdown/render';

import { parseMeetingTimestamp } from './date';
import type {
  RawMeeting,
  RawMeetingTranscript,
  RawMeetingTranscriptSegment,
} from './raw-schema';
import { meetingCanonical, meetingUrl } from './routes';
import type {
  Meeting,
  MeetingMoment,
  MeetingSpeaker,
  MeetingTranscriptPart,
  MeetingTranscriptSegment,
  MeetingTranscriptTime,
} from './types';

export interface RawMeetingEntryInput {
  readonly id: string;
  readonly data: RawMeeting;
}

export interface RawMeetingTranscriptEntryInput {
  readonly id: string;
  readonly part: number;
  readonly data: RawMeetingTranscript;
}

interface MapRawMeetingOptions {
  readonly mentionRegistry: SiteMentionRegistry;
}

const TRANSCRIPT_TIME =
  /^(?<hours>\d{2}):(?<minutes>[0-5]\d):(?<seconds>[0-5]\d)$/;

const parseMoment = (value: string, context: string): MeetingMoment => {
  const timestamp = parseMeetingTimestamp(value);

  if (!timestamp) {
    throw new Error(
      `${context} must use dd.mm.yyyy, dd.mm.yyyy hh:mm, or YYYY-MM-DD`,
    );
  }

  return {
    at: timestamp.at,
    iso: timestamp.iso,
    hasTime: timestamp.has_time,
  };
};

export const parseMeetingTranscriptTime = (
  value: string,
  context: string,
): MeetingTranscriptTime => {
  const match = value.match(TRANSCRIPT_TIME);

  if (!match?.groups) {
    throw new Error(`${context} must use HH:MM:SS`);
  }

  const hours = Number(match.groups.hours);
  const minutes = Number(match.groups.minutes);
  const seconds = Number(match.groups.seconds);

  return {
    value,
    totalSeconds: hours * 3600 + minutes * 60 + seconds,
  };
};

const withSpeakerDescription = (
  speaker: MeetingSpeaker,
  description?: string,
): MeetingSpeaker => (description ? { ...speaker, description } : speaker);

const mapSpeaker = (
  id: string,
  raw: RawMeeting['speakers'][string],
  context: string,
  mentionRegistry: SiteMentionRegistry,
): MeetingSpeaker => {
  if ('person' in raw) {
    const target = mentionRegistry.get(raw.person);

    if (!target || target.type !== 'person') {
      throw new Error(`${context} references unknown person "${raw.person}"`);
    }

    const speaker: MeetingSpeaker = {
      id,
      kind: 'person',
      label: target.label,
      personSlug: target.slug,
      url: target.htmlUrl,
    };
    const description = raw.description ?? target.linkTitle;

    return withSpeakerDescription(speaker, description);
  }

  const speaker: MeetingSpeaker = {
    id,
    kind: 'local',
    label: raw.name,
  };

  return withSpeakerDescription(speaker, raw.description);
};

const segmentAnchor = (
  start: MeetingTranscriptTime,
  anchorCounts: Map<string, number>,
): string => {
  const base = `t-${start.value.replaceAll(':', '-')}`;
  const count = (anchorCounts.get(base) ?? 0) + 1;

  anchorCounts.set(base, count);

  return count === 1 ? base : `${base}-${count}`;
};

const mapSegment = (
  raw: RawMeetingTranscriptSegment,
  context: string,
  mentionRegistry: SiteMentionRegistry,
  speakers: ReadonlyMap<string, MeetingSpeaker>,
  anchorCounts: Map<string, number>,
  previousStart?: MeetingTranscriptTime,
): MeetingTranscriptSegment => {
  const speaker = speakers.get(raw.speaker);

  if (!speaker) {
    throw new Error(`${context} references unknown speaker "${raw.speaker}"`);
  }

  const start = parseMeetingTranscriptTime(raw.start, `${context} start`);

  if (previousStart && start.totalSeconds < previousStart.totalSeconds) {
    throw new Error(`${context} start cannot be earlier than previous segment`);
  }

  const textMarkdown = preprocessSiteMarkdownContent(
    raw.text,
    `${context} text`,
    mentionRegistry,
  ).markdown;

  return {
    anchor: segmentAnchor(start, anchorCounts),
    start,
    speakerId: raw.speaker,
    speaker,
    text: raw.text,
    textMarkdown,
    textHtml: renderMarkdown(textMarkdown),
  };
};

const mapPart = (
  rawSegments: readonly RawMeetingTranscriptSegment[],
  index: number,
  hasMultipleParts: boolean,
  mentionRegistry: SiteMentionRegistry,
  speakers: ReadonlyMap<string, MeetingSpeaker>,
  anchorCounts: Map<string, number>,
): MeetingTranscriptPart => {
  const firstStart = parseMeetingTranscriptTime(
    rawSegments[0]?.start ?? '',
    hasMultipleParts
      ? `meeting transcript part ${index} first segment start`
      : 'meeting transcript first segment start',
  );

  if (firstStart.totalSeconds !== 0) {
    throw new Error(
      hasMultipleParts
        ? `meeting transcript part ${index} must start at 00:00:00`
        : 'meeting transcript must start at 00:00:00',
    );
  }

  let previousStart: MeetingTranscriptTime | undefined;
  const segments = rawSegments.map((raw, segmentIndex) => {
    const context = hasMultipleParts
      ? `meeting transcript part ${index} segment ${segmentIndex}`
      : `meeting transcript segment ${segmentIndex}`;
    const segment = mapSegment(
      raw,
      context,
      mentionRegistry,
      speakers,
      anchorCounts,
      previousStart,
    );

    previousStart = segment.start;
    return segment;
  });

  return {
    index,
    segments,
  };
};

const sortTranscriptParts = (
  entry: RawMeetingEntryInput,
  transcriptEntries: readonly RawMeetingTranscriptEntryInput[],
): readonly RawMeetingTranscriptEntryInput[] => {
  const sorted = [...transcriptEntries].sort((a, b) => a.part - b.part);
  const seen = new Set<number>();

  sorted.forEach((transcript, index) => {
    if (entry.id !== transcript.id) {
      throw new Error(
        `meeting "${entry.id}" transcript id must match entry id "${transcript.id}"`,
      );
    }

    if (seen.has(transcript.part)) {
      throw new Error(
        `meeting "${entry.id}" has duplicate transcript part ${transcript.part}`,
      );
    }

    seen.add(transcript.part);

    if (transcript.part !== index + 1) {
      throw new Error(
        `meeting "${entry.id}" transcript files must be consecutive from transcript.yaml`,
      );
    }
  });

  return sorted;
};

export const mapRawMeeting = (
  entry: RawMeetingEntryInput,
  transcriptEntries: readonly RawMeetingTranscriptEntryInput[],
  opts: MapRawMeetingOptions,
): Meeting => {
  const transcriptParts = sortTranscriptParts(entry, transcriptEntries);

  if (transcriptParts.length === 0) {
    throw new Error(`meeting "${entry.id}" has no matching transcript`);
  }

  const date = parseMoment(entry.data.date, `meeting "${entry.id}" date`);
  const updatedAt = entry.data.updated_at
    ? parseMoment(entry.data.updated_at, `meeting "${entry.id}" updated_at`)
    : undefined;

  if (updatedAt && updatedAt.at.valueOf() < date.at.valueOf()) {
    throw new Error(
      `meeting "${entry.id}" updated_at cannot be earlier than date`,
    );
  }

  const speakerList = Object.entries(entry.data.speakers).map(([id, raw]) =>
    mapSpeaker(
      id,
      raw,
      `meeting "${entry.id}" speaker "${id}"`,
      opts.mentionRegistry,
    ),
  );
  const speakers = new Map(speakerList.map((speaker) => [speaker.id, speaker]));
  const anchorCounts = new Map<string, number>();
  const hasMultipleParts = transcriptParts.length > 1;
  const parts = transcriptParts.map((transcript) =>
    mapPart(
      transcript.data.segments,
      transcript.part,
      hasMultipleParts,
      opts.mentionRegistry,
      speakers,
      anchorCounts,
    ),
  );
  const segments = parts.flatMap((part) => part.segments);

  return {
    id: entry.id,
    slug: entry.id,
    title: entry.data.title,
    date,
    updatedAt,
    context: entry.data.context,
    sourceUrls: entry.data.source_urls ?? [],
    url: meetingUrl(entry.id),
    canonical: meetingCanonical(entry.id),
    transcript: {
      speakers: speakerList,
      parts,
      segments,
    },
  } satisfies Meeting;
};

import type { CollectionEntry } from 'astro:content';

import { compareRuText } from '@shelkovo/format';

import type { SiteMentionRegistry } from '@/lib/mentions';
import { loadSiteMentionRegistry } from '@/lib/mentions/registry';

import { mapRawMeeting } from './mapper';
import type { RawMeetingTranscriptEntryInput } from './mapper';
import type { Meeting, MeetingsDataset } from './types';

export type MeetingEntry = Pick<
  CollectionEntry<'meetingEntries'>,
  'id' | 'data'
>;
export type MeetingTranscriptEntry = Pick<
  CollectionEntry<'meetingTranscripts'>,
  'id' | 'data'
>;

let cache: Promise<MeetingsDataset> | undefined;

const TRANSCRIPT_ENTRY_ID =
  /^(?<id>[a-z0-9]+(?:-[a-z0-9]+)*)\/(?<part>[1-9]\d*)$/;

const compareMeetingsDesc = (a: Meeting, b: Meeting): number => {
  const date = b.date.at.valueOf() - a.date.at.valueOf();

  if (date) {
    return date;
  }

  return compareRuText(a.title, b.title) || compareRuText(a.slug, b.slug);
};

const parseTranscriptEntry = (
  entry: MeetingTranscriptEntry,
): RawMeetingTranscriptEntryInput => {
  const match = entry.id.match(TRANSCRIPT_ENTRY_ID);

  if (!match?.groups) {
    throw new Error(
      `meeting transcript id "${entry.id}" must use [slug]/[part]`,
    );
  }

  return {
    id: match.groups.id,
    part: Number(match.groups.part),
    data: entry.data,
  };
};

const transcriptMap = (
  transcripts: readonly MeetingTranscriptEntry[],
): ReadonlyMap<string, readonly RawMeetingTranscriptEntryInput[]> => {
  const byId = new Map<string, RawMeetingTranscriptEntryInput[]>();

  transcripts.map(parseTranscriptEntry).forEach((transcript) => {
    const parts = byId.get(transcript.id) ?? [];

    if (parts.some((part) => part.part === transcript.part)) {
      throw new Error(
        `duplicate meeting transcript ${transcript.id}/${transcript.part}`,
      );
    }

    byId.set(transcript.id, [...parts, transcript]);
  });

  return byId;
};

export const buildMeetingsDataset = (
  entries: readonly MeetingEntry[],
  transcripts: readonly MeetingTranscriptEntry[],
  opts?: {
    readonly mentionRegistry?: SiteMentionRegistry;
  },
): MeetingsDataset => {
  const mentionRegistry = opts?.mentionRegistry ?? new Map();
  const transcriptsById = transcriptMap(transcripts);
  const entryIds = new Set(entries.map((entry) => entry.id));

  for (const id of transcriptsById.keys()) {
    if (!entryIds.has(id)) {
      throw new Error(`meeting transcript "${id}" has no matching entry`);
    }
  }

  const meetings = entries
    .map((entry) => {
      const transcriptParts = transcriptsById.get(entry.id);

      if (!transcriptParts) {
        throw new Error(`meeting "${entry.id}" has no matching transcript`);
      }

      return mapRawMeeting(entry, transcriptParts, { mentionRegistry });
    })
    .sort(compareMeetingsDesc);

  return {
    meetings,
    bySlug: new Map(meetings.map((meeting) => [meeting.slug, meeting])),
  };
};

const buildMeetingsData = async (): Promise<MeetingsDataset> => {
  const [{ getCollection }, mentionRegistry] = await Promise.all([
    import('astro:content'),
    loadSiteMentionRegistry(),
  ]);
  const [entries, transcripts] = await Promise.all([
    getCollection('meetingEntries') as Promise<readonly MeetingEntry[]>,
    getCollection('meetingTranscripts') as Promise<
      readonly MeetingTranscriptEntry[]
    >,
  ]);

  return buildMeetingsDataset(entries, transcripts, { mentionRegistry });
};

export const loadMeetingsData = (): Promise<MeetingsDataset> => {
  cache ??= buildMeetingsData();

  return cache;
};

export const loadMeetings = async (): Promise<readonly Meeting[]> =>
  (await loadMeetingsData()).meetings;

export const loadMeeting = async (
  slug: string,
): Promise<Meeting | undefined> => {
  const normalized = slug.trim();

  if (!normalized) {
    return undefined;
  }

  return (await loadMeetingsData()).bySlug.get(normalized);
};

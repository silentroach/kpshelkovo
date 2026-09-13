import { z } from 'astro/zod';

const SlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const MEETING_TRANSCRIPT_FILE = /^transcript(?:-(?<part>[2-9]|[1-9]\d+))?\.yaml$/;

function failMeeting(entry: string, reason: string): never {
  throw new Error(`meeting data path "${entry}" ${reason}`);
}

export function meetingSourceId(entry: string): string {
  const parts = entry.split('/');

  if (parts.length !== 2 || parts[1] !== 'index.yaml') {
    failMeeting(entry, 'must be exactly [slug]/index.yaml');
  }

  const [slug] = parts;

  if (!SlugSchema.safeParse(slug).success) {
    failMeeting(entry, 'slug must use lower-case Latin letters, digits, and hyphen');
  }

  return slug;
}

export function meetingTranscriptYamlId(entry: string): string {
  const parts = entry.split('/');

  if (parts.length !== 2) {
    failMeeting(entry, 'must be exactly [slug]/transcript.yaml or [slug]/transcript-N.yaml');
  }

  const [slug, fileName] = parts;
  const match = fileName?.match(MEETING_TRANSCRIPT_FILE);

  if (!SlugSchema.safeParse(slug).success) {
    failMeeting(entry, 'slug must use lower-case Latin letters, digits, and hyphen');
  }

  if (!match) {
    failMeeting(entry, 'must use transcript.yaml or transcript-N.yaml with N starting from 2');
  }

  return `${slug}/${match.groups?.part ?? '1'}`;
}

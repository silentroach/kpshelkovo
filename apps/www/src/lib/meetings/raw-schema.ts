import { isAbsoluteUrl } from '@shelkovo/url';
import { z } from 'astro/zod';

import { contentDateSchema } from '@/lib/content-date';

const SPEAKER_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIME = /^\d{2}:[0-5]\d:[0-5]\d$/;

const text = z.string().trim();

const absoluteUrl = (name: string) =>
  text.refine(
    (value) => isAbsoluteUrl(value),
    `${name} must be an absolute URL`,
  );

const speakerId = (name: string) =>
  text.refine(
    (value) => SPEAKER_ID.test(value),
    `${name} must use lower-case Latin letters, digits, and hyphen`,
  );

const time = (name: string) =>
  text.refine(
    (value) => TIME.test(value),
    `${name} must use HH:MM:SS with minutes and seconds from 00 to 59`,
  );

const RawMeetingSpeakerSchema = z.union([
  z
    .object({
      person: speakerId('speakers[].person'),
      description: text.optional(),
    })
    .strict(),
  z
    .object({
      name: text,
      description: text.optional(),
    })
    .strict(),
]);

const RawMeetingTranscriptSegmentSchema = z
  .object({
    start: time('segments[].start'),
    speaker: speakerId('segments[].speaker'),
    text,
  })
  .strict();

const RawMeetingTranscriptSegmentsSchema = z
  .array(RawMeetingTranscriptSegmentSchema)
  .min(1, 'segments must have at least one segment');

const RawMeetingSpeakersSchema = z
  .record(z.string(), RawMeetingSpeakerSchema)
  .superRefine((speakers, ctx) => {
    const entries = Object.entries(speakers);

    if (entries.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'speakers must have at least one speaker',
      });
      return;
    }

    entries.forEach(([id]) => {
      if (!SPEAKER_ID.test(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [id],
          message:
            'speaker id must use lower-case Latin letters, digits, and hyphen',
        });
      }
    });
  });

export const RawMeetingSchema = z
  .object({
    title: text,
    date: contentDateSchema('date'),
    context: text,
    speakers: RawMeetingSpeakersSchema,
    updated_at: contentDateSchema('updated_at').optional(),
    source_urls: z.array(absoluteUrl('source_urls[]')).min(1).optional(),
  })
  .strict();

export type RawMeeting = z.output<typeof RawMeetingSchema>;

export const RawMeetingTranscriptSchema = z
  .object({
    segments: RawMeetingTranscriptSegmentsSchema,
  })
  .strict();

export type RawMeetingTranscript = z.output<typeof RawMeetingTranscriptSchema>;
export type RawMeetingTranscriptSegment = z.output<
  typeof RawMeetingTranscriptSegmentSchema
>;

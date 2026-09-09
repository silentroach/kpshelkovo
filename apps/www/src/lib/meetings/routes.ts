import { canon, withBase } from '@/lib/site';

const MEETINGS_ROOT = '/meetings/';
const MEETINGS_MARKDOWN = '/meetings/index.md';

const need = (value: string, name: string): string => {
  const text = value.trim();

  if (!text) {
    throw new Error(`${name} is required`);
  }

  return text;
};

export const meetingPath = (slug: string): string => `${MEETINGS_ROOT}${need(slug, 'slug')}/`;

const needPart = (value: number | string): string => {
  const text = String(value).trim();

  if (!/^[1-9]\d*$/u.test(text)) {
    throw new Error('part must be a positive integer');
  }

  return text;
};

export const meetingsMarkdownPath = (): string => MEETINGS_MARKDOWN;

export const meetingMarkdownPath = (slug: string): string => `${meetingPath(slug)}index.md`;

export const meetingTranscriptPartMarkdownPath = (slug: string, part: number | string): string =>
  `${meetingPath(slug)}transcript/${needPart(part)}.md`;

export const meetingPattern = (): string => '/meetings/:slug/';

export const meetingsMarkdownPattern = (): string => '/meetings/index.md';

export const meetingMarkdownPattern = (): string => '/meetings/:slug/index.md';

export const meetingTranscriptPartMarkdownPattern = (): string =>
  '/meetings/:slug/transcript/:part.md';

export const meetingUrl = (slug: string): string => withBase(meetingPath(slug));

export const meetingsMarkdownUrl = (): string => withBase(MEETINGS_MARKDOWN);

export const meetingMarkdownUrl = (slug: string): string => withBase(meetingMarkdownPath(slug));

export const meetingTranscriptPartMarkdownUrl = (slug: string, part: number | string): string =>
  withBase(meetingTranscriptPartMarkdownPath(slug, part));

export const meetingCanonical = (slug: string): string => canon(meetingPath(slug));

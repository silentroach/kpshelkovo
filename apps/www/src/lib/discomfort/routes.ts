import { canon, withBase } from '@/lib/site';

const DISCOMFORT_ROOT = '/815/discomfort/';
const DISCOMFORT_MARKDOWN = '/815/discomfort/index.md';

const eventSlug = (slug: string): string => {
  const value = slug.trim();

  if (!value) {
    throw new Error('discomfort event slug is required');
  }

  return value;
};

export const discomfortPath = (): string => DISCOMFORT_ROOT;
export const discomfortMarkdownPath = (): string => DISCOMFORT_MARKDOWN;
export const discomfortUrl = (): string => withBase(DISCOMFORT_ROOT);
export const discomfortMarkdownUrl = (): string =>
  withBase(DISCOMFORT_MARKDOWN);
export const discomfortCanonical = (): string => canon(DISCOMFORT_ROOT);
export const discomfortEventUrl = (slug: string): string =>
  `${discomfortUrl()}#${eventSlug(slug)}`;

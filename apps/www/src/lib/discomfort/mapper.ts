import {
  preprocessSiteMarkdownContent,
  type PreprocessedSiteMarkdown,
} from '@/lib/markdown/render';
import type { SiteMentionRegistry } from '@/lib/mentions';

import type { DiscomfortEventEntry } from './load';
import { discomfortEventUrl } from './routes';
import type { DiscomfortEvent } from './types';

const requireBody = (entry: DiscomfortEventEntry): string => {
  const body = entry.body?.trim();

  if (!body) {
    throw new Error(`discomfort event "${entry.id}" body is required`);
  }

  return body;
};

const preprocessEventBody = (
  entry: DiscomfortEventEntry,
  mentionRegistry: SiteMentionRegistry,
): PreprocessedSiteMarkdown =>
  preprocessSiteMarkdownContent(
    requireBody(entry),
    `discomfort event "${entry.id}" body`,
    mentionRegistry,
  );

export const mapRawDiscomfortEvent = (
  entry: DiscomfortEventEntry,
  mentionRegistry: SiteMentionRegistry,
): DiscomfortEvent => {
  const body = preprocessEventBody(entry, mentionRegistry);

  return {
    slug: entry.id,
    dateIso: entry.data.date,
    title: entry.data.title,
    url: discomfortEventUrl(entry.id),
    body: body.markdown,
    mentions: body.mentions,
  };
};

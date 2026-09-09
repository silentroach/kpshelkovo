import {
  preprocessSiteMarkdownContent,
  type PreprocessedSiteMarkdown
} from '@/lib/markdown/render';
import type { EntityMentionTarget, SiteMentionRegistry } from '@/lib/mentions';

import type { ReviewEntry } from './load';
import { reviewCanonical, reviewMarkdownUrl, reviewUrl } from './routes';
import { reviewIdFromParts } from './schema';
import type { Review, ReviewAspect } from './types';

interface MappedReviewAspect {
  readonly aspect: ReviewAspect;
  readonly mentions: readonly EntityMentionTarget[];
}

const normalizeOptionalText = (value: string | undefined): string | undefined => {
  const text = value?.trim();

  return text ? text : undefined;
};

const requireBody = (entry: ReviewEntry): string => {
  const body = entry.body?.trim() ?? '';

  if (!body) {
    throw new Error(`review "${entry.id}" body is required`);
  }

  return body;
};

const preprocessReviewContent = (
  markdown: string,
  context: string,
  mentionRegistry?: SiteMentionRegistry
): PreprocessedSiteMarkdown => {
  if (mentionRegistry) {
    return preprocessSiteMarkdownContent(markdown, context, mentionRegistry);
  }

  const body = markdown.trimEnd();

  return {
    markdown: body.trim() ? body : '',
    mentions: []
  };
};

const mapAspect = (
  entry: ReviewEntry,
  aspect: NonNullable<ReviewEntry['data']['aspects']>[number],
  index: number,
  mentionRegistry?: SiteMentionRegistry
): MappedReviewAspect => {
  const body = aspect.body
    ? preprocessReviewContent(
        aspect.body,
        `review "${entry.id}" aspects[${index}].body`,
        mentionRegistry
      )
    : undefined;

  return {
    aspect: {
      type: aspect.type,
      rating: aspect.rating,
      body: body?.markdown
    },
    mentions: body?.mentions ?? []
  };
};

export const mapRawReview = (entry: ReviewEntry, mentionRegistry?: SiteMentionRegistry): Review => {
  const expectedId = reviewIdFromParts({
    publishedIso: entry.data.published_at,
    slug: entry.data.slug
  });

  if (entry.id !== expectedId) {
    throw new Error(`review "${entry.id}" id must equal "${expectedId}"`);
  }

  const body = preprocessReviewContent(
    requireBody(entry),
    `review "${entry.id}" body`,
    mentionRegistry
  );
  const mappedAspects =
    entry.data.aspects?.map((aspect, index) => mapAspect(entry, aspect, index, mentionRegistry)) ??
    [];

  return {
    id: entry.id,
    slug: entry.data.slug,
    title: normalizeOptionalText(entry.data.title),
    seo: entry.data.seo,
    author: normalizeOptionalText(entry.data.author),
    area: entry.data.area,
    publishedAt: new Date(`${entry.data.published_at}T00:00:00.000Z`),
    publishedIso: entry.data.published_at,
    url: reviewUrl({ id: entry.id }),
    markdownUrl: reviewMarkdownUrl({ id: entry.id }),
    canonical: reviewCanonical({ id: entry.id }),
    body: body.markdown,
    aspects: mappedAspects.map((item) => item.aspect),
    mentions: [...body.mentions, ...mappedAspects.flatMap((item) => item.mentions)]
  };
};

import { extractFirstMarkdownText } from '@shelkovo/markdown';

import { createEntityMentionSourceRefs } from '@/lib/mentions';
import type { EntityMentionSourceRef } from '@/lib/mentions';

import { formatReviewTitle } from './view';
import type { Review } from './types';

type ReviewMentionRefSource = Pick<
  Review,
  | 'id'
  | 'title'
  | 'url'
  | 'markdownUrl'
  | 'body'
  | 'mentions'
  | 'publishedIso'
  | 'publishedAt'
>;

export const createReviewMentionRefs = (
  review: ReviewMentionRefSource,
): readonly EntityMentionSourceRef[] => {
  if (!review.mentions.length) {
    return [];
  }

  return createEntityMentionSourceRefs(review.mentions, {
    source: {
      section: 'reviews',
      kind: 'review',
      id: review.id,
    },
    title: formatReviewTitle(review),
    htmlUrl: review.url,
    markdownUrl: review.markdownUrl,
    excerpt: extractFirstMarkdownText(review.body),
    mentionedAt: review.publishedAt.toISOString(),
    sortKey: review.publishedAt.valueOf(),
  });
};

import { getCollection, type CollectionEntry } from 'astro:content';

import type { SiteMentionRegistry } from '@/lib/mentions';
import { loadSiteMentionRegistry } from '@/lib/mentions/registry';

import { mapRawReview } from './mapper';
import type { RawReview } from './raw-schema';
import type { Review, ReviewsDataset } from './types';

export type ReviewEntry = Pick<CollectionEntry<'reviews'>, 'id' | 'body'> & {
  readonly data: RawReview;
};

let cache: Promise<ReviewsDataset> | undefined;

const compareReviewsPublishedDesc = (a: Review, b: Review): number =>
  b.publishedAt.valueOf() - a.publishedAt.valueOf() || a.id.localeCompare(b.id);

const validateUniqueIds = (reviews: readonly Review[]): void => {
  const seen = new Set<string>();

  for (const review of reviews) {
    if (seen.has(review.id)) {
      throw new Error(`duplicate review id "${review.id}"`);
    }

    seen.add(review.id);
  }
};

export const buildReviewsDataset = (
  entries: readonly ReviewEntry[],
  opts?: {
    readonly mentionRegistry?: SiteMentionRegistry;
  },
): ReviewsDataset => {
  const mentionRegistry = opts?.mentionRegistry;
  const reviews = entries
    .map((entry) => mapRawReview(entry, mentionRegistry))
    .sort(compareReviewsPublishedDesc);

  validateUniqueIds(reviews);

  return {
    reviews,
    byId: new Map(reviews.map((review) => [review.id, review] as const)),
  };
};

const buildReviewsData = async (): Promise<ReviewsDataset> =>
  buildReviewsDataset(await getCollection('reviews'), {
    mentionRegistry: await loadSiteMentionRegistry(),
  });

export const loadReviewsData = (): Promise<ReviewsDataset> => {
  cache ??= buildReviewsData();

  return cache;
};

export const loadReviews = async (): Promise<readonly Review[]> =>
  (await loadReviewsData()).reviews;

export const loadReview = async (id: string): Promise<Review | undefined> => {
  const key = id.trim();

  return key ? (await loadReviewsData()).byId.get(key) : undefined;
};

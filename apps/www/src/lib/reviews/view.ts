import { formatDate } from '@shelkovo/format';

import { formatArea, type Area } from '@/lib/areas';

import {
  REVIEW_ASPECT_ORGANIZATIONS,
  REVIEW_AUTHOR_FALLBACK,
  type ReviewAspectType,
} from './schema';
import type { Review, ReviewAspect } from './types';

const ASPECT_LABELS: Record<ReviewAspectType, string> = {
  place: 'Место и среда',
  developer: 'Застройщик',
  management: 'Обслуживание',
};

const ASPECT_ORDER: Record<ReviewAspectType, number> = {
  place: 0,
  developer: 1,
  management: 2,
};

export const REVIEWS_PROSE = 'ui-prose max-w-[65ch]';

export const formatReviewArea = (area: Area): string => formatArea(area);

export const formatReviewDate = (
  review: Pick<Review, 'publishedIso'>,
): string => formatDate(review.publishedIso);

export const formatReviewAuthor = (review: Pick<Review, 'author'>): string =>
  review.author ?? REVIEW_AUTHOR_FALLBACK;

export const formatReviewTitle = (
  review: Pick<Review, 'title' | 'publishedIso'>,
): string =>
  review.title ?? `Отзыв собственника от ${formatDate(review.publishedIso)}`;

export const formatReviewAspectType = (type: ReviewAspectType): string =>
  ASPECT_LABELS[type];

export const formatReviewAspectLabel = formatReviewAspectType;

export const formatReviewAspectLabelHint = (
  type: ReviewAspectType,
): string | undefined =>
  type === 'place' ? undefined : REVIEW_ASPECT_ORGANIZATIONS[type].name;

export const sortReviewAspects = (
  aspects: readonly ReviewAspect[],
): readonly ReviewAspect[] =>
  [...aspects].sort((a, b) => ASPECT_ORDER[a.type] - ASPECT_ORDER[b.type]);

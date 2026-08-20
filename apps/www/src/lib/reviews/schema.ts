export const REVIEW_ASPECT_TYPES = [
  'place',
  'developer',
  'management',
] as const;
export type ReviewAspectType = (typeof REVIEW_ASPECT_TYPES)[number];

export const REVIEW_ASPECT_ORGANIZATIONS = {
  developer: {
    name: 'Земля МО',
    role: 'застройщик',
  },
  management: {
    name: 'ОК Комфорт',
    role: 'обслуживание',
  },
} as const;
export type ReviewOrganizationAspectType =
  keyof typeof REVIEW_ASPECT_ORGANIZATIONS;

export const REVIEW_AUTHOR_FALLBACK = 'Анонимный собственник';
export const REVIEW_ID = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const REVIEW_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const REVIEW_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isReviewId = (value: string): boolean => REVIEW_ID.test(value);

export const reviewIdFromParts = (input: {
  readonly publishedIso: string;
  readonly slug: string;
}): string => `${input.publishedIso}-${input.slug}`;

export const CONTACT_CATEGORIES = [
  'electricity',
  'construction',
  'fence',
  'waste-removal',
  'education',
  'garden',
  'food',
] as const;
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export const CONTACT_REVIEW_SENTIMENTS = ['positive', 'negative'] as const;
export type ContactReviewSentiment = (typeof CONTACT_REVIEW_SENTIMENTS)[number];

export const CONTACT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CONTACT_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isContactSlug = (value: string): boolean =>
  CONTACT_SLUG.test(value);

export const isContactCategory = (value: string): value is ContactCategory =>
  CONTACT_CATEGORIES.includes(value as ContactCategory);

export const isContactCalendarDate = (value: string): boolean => {
  if (!CONTACT_DATE.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.valueOf())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value;
};

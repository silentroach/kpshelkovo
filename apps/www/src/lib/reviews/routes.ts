import { canon, withBase } from '@/lib/site';

import { isReviewId } from './schema';

const REVIEWS_ROOT = '/reviews/';
const REVIEWS_MARKDOWN = '/reviews/index.md';
const REVIEWS_RULES_ROOT = '/reviews/rules/';
const REVIEWS_RULES_MARKDOWN = '/reviews/rules/index.md';

const need = (value: string, name: string): string => {
  const text = value.trim();

  if (!text) {
    throw new Error(`${name} is required`);
  }

  return text;
};

const reviewId = (input: { readonly id: string }): string => {
  const id = need(input.id, 'id');

  if (!isReviewId(id)) {
    throw new Error(`review id "${input.id}" is invalid`);
  }

  return id;
};

const reviewPath = (input: { readonly id: string }): string => `/reviews/${reviewId(input)}/`;

export const reviewsPath = (): string => REVIEWS_ROOT;
export const reviewsMarkdownPath = (): string => REVIEWS_MARKDOWN;
export const reviewsRulesPath = (): string => REVIEWS_RULES_ROOT;
export const reviewsRulesMarkdownPath = (): string => REVIEWS_RULES_MARKDOWN;

export const reviewPattern = (): string => '/reviews/:id/';
export const reviewMarkdownPattern = (): string => '/reviews/:id/index.md';

export const reviewsUrl = (): string => withBase(REVIEWS_ROOT);
export const reviewsMarkdownUrl = (): string => withBase(REVIEWS_MARKDOWN);
export const reviewsRulesUrl = (): string => withBase(REVIEWS_RULES_ROOT);
export const reviewsRulesMarkdownUrl = (): string => withBase(REVIEWS_RULES_MARKDOWN);
export const reviewUrl = (input: { readonly id: string }): string => withBase(reviewPath(input));
export const reviewMarkdownUrl = (input: { readonly id: string }): string =>
  withBase(`${reviewPath(input)}index.md`);
export const reviewCanonical = (input: { readonly id: string }): string => canon(reviewPath(input));

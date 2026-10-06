import type { NewsArticle } from '@/lib/news/types';

export interface HomeNewsSelection {
  readonly lead?: NewsArticle;
  readonly secondary: readonly NewsArticle[];
}

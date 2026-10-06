import { compareArticlesPublishedDesc } from '@/lib/news/sort';
import type { NewsArticle } from '@/lib/news/types';

import type { HomeNewsSelection } from './news.types';

export const selectHomeNews = (articles: readonly NewsArticle[]): HomeNewsSelection => {
  const latest = articles.toSorted(compareArticlesPublishedDesc);
  // Stable sorting preserves the shared ID order for equally dated pins.
  const lead =
    latest
      .filter((article) => article.pinned)
      .toSorted((a, b) => a.publishedAt.valueOf() - b.publishedAt.valueOf())[0] ?? latest[0];

  return {
    lead,
    secondary: latest.filter((article) => article.id !== lead?.id).slice(0, 2)
  };
};

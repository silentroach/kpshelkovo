import { compareRuText } from '@shelkovo/format';

import type { NewsListArticle, NewsTagPage } from './types';

interface PublishedLike {
  readonly id: string;
  readonly publishedAt: Date;
}

export function compareArticlesPublishedDesc(a: PublishedLike, b: PublishedLike): number {
  const delta = b.publishedAt.valueOf() - a.publishedAt.valueOf();

  return delta || compareRuText(a.id, b.id);
}

export function compareTagPages(a: NewsTagPage, b: NewsTagPage): number {
  const count = b.count - a.count;

  if (count) {
    return count;
  }

  const recent =
    (b.latest[0]?.publishedAt.valueOf() ?? 0) - (a.latest[0]?.publishedAt.valueOf() ?? 0);

  if (recent) {
    return recent;
  }

  return compareRuText(a.label, b.label);
}

export const latestFirst = (items: readonly NewsListArticle[]): readonly NewsListArticle[] =>
  items.slice().sort(compareArticlesPublishedDesc);

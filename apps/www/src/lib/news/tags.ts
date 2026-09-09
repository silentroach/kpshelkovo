import { compareRuText } from '@shelkovo/format';

import { NEWS_LATEST_LIMIT } from './config';
import { tagMarkdownUrl, tagUrl } from './routes';
import { normalizeTagKey, normalizeTagLabel } from './schema';
import { compareTagPages, latestFirst } from './sort';
import type { NewsListArticle, NewsTag, NewsTagPage } from './types';

interface TagBucket {
  readonly label: string;
  readonly key: string;
  readonly articles: NewsListArticle[];
}

const byLabel = (a: NewsTag, b: NewsTag): number => compareRuText(a.label, b.label);

export function buildArticleTags(values: readonly string[] | undefined): readonly NewsTag[] {
  if (!values?.length) {
    return [];
  }

  return values
    .map((value) => {
      const label = normalizeTagLabel(value);
      const key = normalizeTagKey(label);

      return {
        label,
        key,
        url: tagUrl(key)
      } satisfies NewsTag;
    })
    .sort(byLabel);
}

export function buildTagIndex(items: readonly NewsListArticle[]): readonly NewsTagPage[] {
  const tags = new Map<string, TagBucket>();

  for (const item of items) {
    for (const tag of item.tags) {
      const current = tags.get(tag.key);

      if (current) {
        current.articles.push(item);
        continue;
      }

      tags.set(tag.key, {
        label: tag.label,
        key: tag.key,
        articles: [item]
      });
    }
  }

  return Array.from(tags.values())
    .map((tag) => ({
      id: tag.key,
      label: tag.label,
      key: tag.key,
      url: tagUrl(tag.key),
      markdownUrl: tagMarkdownUrl(tag.key),
      count: tag.articles.length,
      latest: latestFirst(tag.articles).slice(0, NEWS_LATEST_LIMIT)
    }))
    .sort(compareTagPages);
}

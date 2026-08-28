import type { GetStaticPaths } from 'astro';
import { padNumber } from '@shelkovo/format';

import { loadNewsArchives, loadNewsArticles, loadNewsTags } from './load';

export const newsYearStaticPaths = (async () => {
  const archives = await loadNewsArchives();

  return archives.years.map((item) => ({
    params: { year: String(item.year) },
  }));
}) satisfies GetStaticPaths;

export const newsMonthStaticPaths = (async () => {
  const archives = await loadNewsArchives();

  return archives.years.flatMap((item) =>
    item.months.map((month) => ({
      params: {
        year: String(month.year),
        month: padNumber(month.month),
      },
    })),
  );
}) satisfies GetStaticPaths;

export const newsArticleStaticPaths = (async () => {
  const articles = await loadNewsArticles();

  return articles.map((item) => ({
    params: {
      year: String(item.year),
      month: padNumber(item.month),
      entry: item.entry,
    },
  }));
}) satisfies GetStaticPaths;

export const newsTagStaticPaths = (async () => {
  const tags = await loadNewsTags();

  return tags.map((item) => ({
    params: { tag: item.key },
  }));
}) satisfies GetStaticPaths;

import { padNumber } from '@shelkovo/format';

import type {
  NewsArchiveSummary,
  NewsArchives,
  NewsListArticle,
  NewsMonthArchive,
  NewsYearArchive,
} from './types';
import { monthMarkdownUrl, monthUrl, yearMarkdownUrl, yearUrl } from './routes';
import { latestFirst } from './sort';

interface YearBucket {
  readonly months: Map<number, NewsListArticle[]>;
}

export const newsMonthKey = (year: number, month: number): string =>
  `${year}/${padNumber(month)}`;

const takeSummary = (
  summaries: ReadonlyMap<string, NewsArchiveSummary>,
  used: Set<string>,
  id: string,
): NewsArchiveSummary => {
  const summary = summaries.get(id);

  if (!summary) {
    throw new Error(`news archive \"${id}\" is missing its summary`);
  }

  used.add(id);
  return summary;
};

export function buildArchives(
  items: readonly NewsListArticle[],
  summaries: ReadonlyMap<string, NewsArchiveSummary>,
): NewsArchives {
  const years = new Map<number, YearBucket>();
  const usedSummaries = new Set<string>();

  for (const item of items) {
    const year = years.get(item.year) ?? {
      months: new Map<number, NewsListArticle[]>(),
    };
    const month = year.months.get(item.month) ?? [];

    month.push(item);
    year.months.set(item.month, month);
    years.set(item.year, year);
  }

  const byYear = new Map<number, NewsYearArchive>();
  const byMonth = new Map<string, NewsMonthArchive>();
  const list = Array.from(years.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, bucket]) => {
      const months = Array.from(bucket.months.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([month, articles]) => {
          const item: NewsMonthArchive = {
            id: newsMonthKey(year, month),
            year,
            month,
            url: monthUrl(year, month),
            markdownUrl: monthMarkdownUrl(year, month),
            count: articles.length,
            summary: takeSummary(
              summaries,
              usedSummaries,
              newsMonthKey(year, month),
            ),
            articles: latestFirst(articles),
          };

          byMonth.set(item.id, item);
          return item;
        });
      const item: NewsYearArchive = {
        year,
        url: yearUrl(year),
        markdownUrl: yearMarkdownUrl(year),
        count: months.reduce((sum, month) => sum + month.count, 0),
        summary: takeSummary(summaries, usedSummaries, String(year)),
        months,
      };

      byYear.set(year, item);
      return item;
    });
  const orphanSummaryId = [...summaries.keys()].find(
    (id) => !usedSummaries.has(id),
  );

  if (orphanSummaryId) {
    throw new Error(
      `news archive summary \"${orphanSummaryId}\" has no matching archive`,
    );
  }

  return {
    years: list,
    byYear,
    byMonth,
  };
}

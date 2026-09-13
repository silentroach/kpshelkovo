import { z } from 'astro/zod';

import { parseContentDate } from '@/lib/content-date';
import { trimMarkdown } from '@/lib/content-source';

const YearSchema = z.string().regex(/^\d{4}$/);
const MonthSchema = z.string().regex(/^(0[1-9]|1[0-2])$/);
const DayKeySchema = z.string().regex(/^(?:0?[1-9]|[12]\d|3[01])$/);
const ArticleDateSchema = z.object({ date: z.unknown() });

function failArticle(entry: string, reason: string): never {
  throw new Error(`news article path "${entry}" ${reason}`);
}

function failNewsSummary(entry: string, reason: string): never {
  throw new Error(`news archive summary path "${entry}" ${reason}`);
}

export function articleSourceId(entry: string, data: unknown): string {
  const id = trimMarkdown(entry).replace(/\/index$/i, '');
  const parts = id.split('/');

  if (parts.length !== 3) {
    failArticle(entry, 'must resolve to YYYY/MM/[entry]');
  }

  const [year, month, key] = parts;

  if (
    !YearSchema.safeParse(year).success ||
    !MonthSchema.safeParse(month).success ||
    key.length === 0
  ) {
    failArticle(entry, 'must use YYYY/MM/[entry] with numeric year and month');
  }

  const input = ArticleDateSchema.safeParse(data);
  const date = input.success ? parseContentDate(input.data.date) : undefined;

  if (date && (date.year !== year || date.month !== month)) {
    failArticle(entry, 'must match the frontmatter date year and month');
  }

  if (/^\d+$/.test(key)) {
    if (!DayKeySchema.safeParse(key).success) {
      failArticle(entry, 'numeric day keys must be valid calendar days');
    }

    if (date && Number(key) !== Number(date.day)) {
      failArticle(entry, 'numeric day keys must match the frontmatter date day');
    }
  }

  return id;
}

export function newsArchiveSummaryId(entry: string, readBody: () => string): string {
  if (!entry.endsWith('.md')) {
    failNewsSummary(entry, 'must be a Markdown file');
  }

  const [year, period, ...rest] = trimMarkdown(entry).split('/');

  if (
    rest.length > 0 ||
    !YearSchema.safeParse(year).success ||
    (period !== 'index' && !MonthSchema.safeParse(period).success)
  ) {
    failNewsSummary(entry, 'must use YYYY/index.md or YYYY/MM.md');
  }

  if (!readBody().trim()) {
    failNewsSummary(entry, 'body is required');
  }

  return period === 'index' ? year : `${year}/${period}`;
}

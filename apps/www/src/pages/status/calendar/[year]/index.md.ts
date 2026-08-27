import type { APIRoute, GetStaticPaths } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import {
  buildStatusCalendarYearGrid,
  currentStatusCalendarYear,
  statusCalendarTodayId,
} from '@/lib/status/calendar';
import { loadStatusData } from '@/lib/status/load';
import { buildStatusYearMarkdown } from '@/lib/status/markdown';
import { statusCalendarYearStaticPaths } from '@/lib/status/routes';

export const prerender = true;

export const getStaticPaths = (() =>
  statusCalendarYearStaticPaths(
    currentStatusCalendarYear(),
  )) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const year = Number(params.year);
  const now = new Date();
  const currentYear = currentStatusCalendarYear(now);

  if (year !== currentYear) {
    throw new Error(`status calendar year "${params.year}" not found`);
  }

  const calendar = buildStatusCalendarYearGrid(
    (await loadStatusData()).calendar,
    year,
    statusCalendarTodayId(now),
  );

  return createMarkdownResponse(buildStatusYearMarkdown(calendar));
};

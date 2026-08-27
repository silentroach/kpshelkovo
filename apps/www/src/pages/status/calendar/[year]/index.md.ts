import type { APIRoute, GetStaticPaths } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import {
  buildStatusCalendarYearGrid,
  currentStatusCalendarYear,
} from '@/lib/status/calendar';
import { loadStatusData } from '@/lib/status/load';
import { buildStatusYearMarkdown } from '@/lib/status/markdown';
import { statusCalendarYearStaticPaths } from '@/lib/status/routes';

export const prerender = true;

export const getStaticPaths = (async () =>
  statusCalendarYearStaticPaths(
    (await loadStatusData()).calendar,
    currentStatusCalendarYear(),
  )) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const year = Number(params.year);
  const calendar = buildStatusCalendarYearGrid(
    (await loadStatusData()).calendar,
    year,
  );

  return createMarkdownResponse(buildStatusYearMarkdown(calendar));
};

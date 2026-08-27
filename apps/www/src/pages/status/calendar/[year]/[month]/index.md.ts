import type { APIRoute, GetStaticPaths } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { getStatusMonthJournal } from '@/lib/status/journal';
import { loadStatusData } from '@/lib/status/load';
import { buildStatusMonthMarkdown } from '@/lib/status/markdown';
import { statusCalendarMonthStaticPaths } from '@/lib/status/routes';

export const prerender = true;

export const getStaticPaths = (async () => {
  const data = await loadStatusData();

  return statusCalendarMonthStaticPaths(data.calendar);
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const year = Number(params.year);
  const month = Number(params.month);
  const journal = getStatusMonthJournal(await loadStatusData(), year, month);

  if (!journal) {
    throw new Error(
      `status calendar month "${params.year}/${params.month}" not found`,
    );
  }

  return createMarkdownResponse(buildStatusMonthMarkdown(journal));
};

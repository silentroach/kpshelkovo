import type { APIRoute, GetStaticPaths } from 'astro';

import { loadEventsData } from '@/lib/events/load';
import { buildEventsMonthMarkdown } from '@/lib/events/markdown';
import { createMarkdownResponse } from '@/lib/markdown/response';
import { canonRoot } from '@/lib/site';

export const prerender = true;
export const getStaticPaths = (async () =>
  (await loadEventsData()).calendar.months.map((month) => ({
    params: { year: month.id.slice(0, 4), month: month.id.slice(5, 7) }
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const month = (await loadEventsData()).calendar.byMonth.get(`${params.year}-${params.month}`);
  if (!month) throw new Error(`events month "${params.year}-${params.month}" not found`);
  return createMarkdownResponse(buildEventsMonthMarkdown(month, canonRoot()));
};

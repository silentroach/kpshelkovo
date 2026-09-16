import type { APIRoute, GetStaticPaths } from 'astro';

import { loadEventsData } from '@/lib/events/load';
import { buildEventsDayMarkdown } from '@/lib/events/markdown';
import { createMarkdownResponse } from '@/lib/markdown/response';
import { canonRoot } from '@/lib/site';

export const prerender = true;
export const getStaticPaths = (async () =>
  (await loadEventsData()).calendar.days.map((day) => ({
    params: { year: day.date.slice(0, 4), month: day.date.slice(5, 7), day: day.date.slice(8, 10) }
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const date = `${params.year}-${params.month}-${params.day}`;
  const day = (await loadEventsData()).calendar.byDay.get(date);
  if (!day) throw new Error(`events day "${date}" not found`);
  return createMarkdownResponse(buildEventsDayMarkdown(day, canonRoot()));
};

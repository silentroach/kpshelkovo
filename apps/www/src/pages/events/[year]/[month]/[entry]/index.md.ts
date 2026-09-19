import type { APIRoute, GetStaticPaths } from 'astro';

import { loadEventsData } from '@/lib/events/load';
import { buildEventMarkdown, buildEventsDayMarkdown } from '@/lib/events/markdown';
import { createMarkdownResponse } from '@/lib/markdown/response';
import { canonRoot } from '@/lib/site';

export const prerender = true;
export const getStaticPaths = (async () => {
  const { calendar, events } = await loadEventsData();
  return [
    ...calendar.days.map((day) => ({
      params: {
        year: day.date.slice(0, 4),
        month: day.date.slice(5, 7),
        entry: day.date.slice(8, 10)
      }
    })),
    ...events.map((event) => ({
      params: {
        year: event.startsDate.slice(0, 4),
        month: event.startsDate.slice(5, 7),
        entry: event.eventSlug
      }
    }))
  ];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const { calendar, events } = await loadEventsData();
  const day = calendar.byDay.get(`${params.year}-${params.month}-${params.entry}`);
  if (day) return createMarkdownResponse(buildEventsDayMarkdown(day, canonRoot()));
  const event = events.find(
    (item) => item.referenceKey === `${params.year}/${params.month}/${params.entry}`
  );
  if (!event) throw new Error(`events entry "${params.entry}" not found`);
  return createMarkdownResponse(buildEventMarkdown(event, canonRoot()));
};

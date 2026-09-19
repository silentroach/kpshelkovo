import type { APIRoute, GetStaticPaths } from 'astro';

import { buildEventIcs } from '@/lib/events/ics';
import { loadEvent, loadEvents } from '@/lib/events/load';
import { absoluteUrl } from '@/lib/site';

export const prerender = true;

export const getStaticPaths = (async () =>
  (await loadEvents())
    .filter((event) => event.icsUrl)
    .map((event) => ({ params: { id: event.id } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const event = params.id ? await loadEvent(params.id) : undefined;
  if (!event?.icsUrl) return new Response('Not found', { status: 404 });

  return new Response(buildEventIcs(event, absoluteUrl('/'), new Date()), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.id}.ics"`
    }
  });
};

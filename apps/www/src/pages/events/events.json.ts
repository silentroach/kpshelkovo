import type { APIRoute } from 'astro';

import { loadEventsData } from '@/lib/events/load';
import { buildEventNewsLinks, buildEventsPublicPayload } from '@/lib/events/public';
import { createJsonResponse } from '@/lib/json-response';
import { loadNewsData } from '@/lib/news/load';
import { canonRoot } from '@/lib/site';

export const prerender = true;
export const GET: APIRoute = async () => {
  const [events, news] = await Promise.all([loadEventsData(), loadNewsData()]);
  const links = buildEventNewsLinks(
    news.articles.map((article) => ({
      url: article.url,
      eventIds: article.events.map((event) => event.id)
    }))
  );
  const root = canonRoot();
  return createJsonResponse(buildEventsPublicPayload(events.events, root, links), {
    headers: {
      Link: `<${root}/events/schemas/events.schema.json>; rel="describedby"; type="application/schema+json"`
    }
  });
};

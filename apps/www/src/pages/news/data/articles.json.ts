import type { APIRoute } from 'astro';

import { createJsonResponse } from '@/lib/json-response';
import { buildNewsPayload, links } from '@/lib/news/discovery';
import { loadNewsData } from '@/lib/news/load';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();

  return createJsonResponse(buildNewsPayload(await loadNewsData()), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Link: links(root)
    }
  });
};

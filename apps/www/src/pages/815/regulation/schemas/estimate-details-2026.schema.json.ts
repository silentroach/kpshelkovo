import type { APIRoute } from 'astro';

import { createJsonResponse } from '@/lib/json-response';
import { detailLinks, detailSchema } from '@/lib/reglament/discovery';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();

  return createJsonResponse(detailSchema(root), {
    headers: {
      'Content-Type': 'application/schema+json; charset=utf-8',
      Link: detailLinks(root)
    }
  });
};

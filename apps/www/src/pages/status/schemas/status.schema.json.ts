import type { APIRoute } from 'astro';

import { createJsonResponse } from '@/lib/json-response';
import { canonRoot } from '@/lib/site';
import { links, schema } from '@/lib/status/discovery';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();

  return createJsonResponse(schema(root), {
    headers: {
      'Content-Type': 'application/schema+json; charset=utf-8',
      Link: links(root)
    }
  });
};

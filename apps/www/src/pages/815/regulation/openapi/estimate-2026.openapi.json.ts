import type { APIRoute } from 'astro';

import { createJsonResponse } from '@/lib/json-response';
import { OAS, links, openapi } from '@/lib/reglament/discovery';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();

  return createJsonResponse(openapi(root), {
    headers: {
      'Content-Type': `${OAS}; charset=utf-8`,
      Link: links(root)
    }
  });
};

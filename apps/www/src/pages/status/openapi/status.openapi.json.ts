import type { APIRoute } from 'astro';

import { canonRoot } from '@/lib/site';
import { OAS, links, openapi } from '@/lib/status/discovery';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(openapi(root));

  return new Response(body, {
    headers: {
      'Content-Type': `${OAS}; charset=utf-8`,
      Link: links(root),
    },
  });
};

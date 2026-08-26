import type { APIRoute } from 'astro';

import { canonRoot } from '@/lib/site';
import { links, schema } from '@/lib/status/discovery';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(schema(root));

  return new Response(body, {
    headers: {
      'Content-Type': 'application/schema+json; charset=utf-8',
      Link: links(root),
    },
  });
};

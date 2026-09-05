import type { APIRoute } from 'astro';

import { detailLinks, detailSchema } from '@/lib/reglament/discovery';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(detailSchema(root));

  return new Response(body, {
    headers: {
      'Content-Type': 'application/schema+json; charset=utf-8',
      Link: detailLinks(root),
    },
  });
};

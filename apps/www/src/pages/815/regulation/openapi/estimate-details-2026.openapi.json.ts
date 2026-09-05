import type { APIRoute } from 'astro';

import { OAS, detailLinks, detailOpenapi } from '@/lib/reglament/discovery';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(detailOpenapi(root));

  return new Response(body, {
    headers: {
      'Content-Type': `${OAS}; charset=utf-8`,
      Link: detailLinks(root),
    },
  });
};

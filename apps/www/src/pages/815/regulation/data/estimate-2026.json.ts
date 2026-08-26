import type { APIRoute } from 'astro';

import { estimate2026 } from '@/data/reglament/estimate-2026';
import { buildReglamentPayload, links } from '@/lib/reglament/discovery';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(buildReglamentPayload(estimate2026));

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Link: links(root),
    },
  });
};

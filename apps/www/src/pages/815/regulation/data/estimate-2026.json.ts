import type { APIRoute } from 'astro';

import { estimate2026 } from '@/data/reglament/estimate-2026';
import { createJsonResponse } from '@/lib/json-response';
import { buildReglamentPayload, links } from '@/lib/reglament/discovery';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();

  return createJsonResponse(buildReglamentPayload(estimate2026), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Link: links(root)
    }
  });
};

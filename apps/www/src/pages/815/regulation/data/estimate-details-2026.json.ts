import type { APIRoute } from 'astro';

import { estimateDetails2026 } from '@/data/reglament/estimate-details-2026';
import { buildPublicEstimateDetails2026Json } from '@/lib/reglament/detail-json';
import { detailLinks } from '@/lib/reglament/discovery';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = buildPublicEstimateDetails2026Json(estimateDetails2026);

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Link: detailLinks(root),
    },
  });
};

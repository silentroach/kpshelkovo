import type { APIRoute } from 'astro';

import { estimate2026 } from '@/data/reglament/estimate-2026';
import { apiContractResponseHeaders } from '@/lib/public-surface/api-contract';
import { buildReglamentPayload } from '@/lib/reglament/discovery';
import { reglamentPublicSurfaceSlice } from '@/lib/reglament/public-surface';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(buildReglamentPayload(estimate2026));

  return new Response(body, {
    headers: apiContractResponseHeaders(
      reglamentPublicSurfaceSlice,
      'reglament:data-estimate-2026',
      root,
    ),
  });
};

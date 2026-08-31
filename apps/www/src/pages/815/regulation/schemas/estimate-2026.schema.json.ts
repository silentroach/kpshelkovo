import type { APIRoute } from 'astro';

import { apiContractResponseHeaders } from '@/lib/public-surface/api-contract';
import { schema } from '@/lib/reglament/discovery';
import { reglamentPublicSurfaceSlice } from '@/lib/reglament/public-surface';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(schema(root));

  return new Response(body, {
    headers: apiContractResponseHeaders(
      reglamentPublicSurfaceSlice,
      'reglament:schema',
      root,
    ),
  });
};

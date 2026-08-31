import type { APIRoute } from 'astro';

import { canonRoot } from '@/lib/site';
import { apiContractResponseHeaders } from '@/lib/public-surface/api-contract';
import { schema } from '@/lib/status/discovery';
import { statusPublicSurfaceSlice } from '@/lib/status/public-surface';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(schema(root));

  return new Response(body, {
    headers: apiContractResponseHeaders(
      statusPublicSurfaceSlice,
      'status:schema',
      root,
    ),
  });
};

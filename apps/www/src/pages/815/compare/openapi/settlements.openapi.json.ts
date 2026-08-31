import type { APIRoute } from 'astro';

import { openapi } from '@/compare/lib/discovery';
import { comparePublicSurfaceSlice } from '@/compare/lib/public-surface';
import { canonRoot as compareRoot } from '@/compare/lib/site';
import { apiContractResponseHeaders } from '@/lib/public-surface/api-contract';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(openapi(compareRoot()));

  return new Response(body, {
    headers: apiContractResponseHeaders(
      comparePublicSurfaceSlice,
      'compare:openapi',
      root,
    ),
  });
};

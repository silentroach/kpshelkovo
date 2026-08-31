import type { APIRoute } from 'astro';

import { openapi } from '@/lib/news/discovery';
import { newsPublicSurfaceSlice } from '@/lib/news/public-surface';
import { apiContractResponseHeaders } from '@/lib/public-surface/api-contract';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(openapi(root));

  return new Response(body, {
    headers: apiContractResponseHeaders(
      newsPublicSurfaceSlice,
      'news:openapi',
      root,
    ),
  });
};

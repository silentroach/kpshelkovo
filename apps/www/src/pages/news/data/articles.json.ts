import type { APIRoute } from 'astro';

import { buildNewsPayload } from '@/lib/news/discovery';
import { loadNewsData } from '@/lib/news/load';
import { newsPublicSurfaceSlice } from '@/lib/news/public-surface';
import { apiContractResponseHeaders } from '@/lib/public-surface/api-contract';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(buildNewsPayload(await loadNewsData()));

  return new Response(body, {
    headers: apiContractResponseHeaders(
      newsPublicSurfaceSlice,
      'news:data',
      root,
    ),
  });
};

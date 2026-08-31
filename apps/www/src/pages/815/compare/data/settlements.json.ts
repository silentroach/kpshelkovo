import type { APIRoute } from 'astro';

import { loadAllData } from '@/compare/lib/data';
import { toFullPayload } from '@/compare/lib/full';
import { comparePublicSurfaceSlice } from '@/compare/lib/public-surface';
import { apiContractResponseHeaders } from '@/lib/public-surface/api-contract';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const data = await loadAllData();
  const root = canonRoot();
  const body = toFullPayload(data);

  return new Response(JSON.stringify(body), {
    headers: apiContractResponseHeaders(
      comparePublicSurfaceSlice,
      'compare:data-settlements',
      root,
    ),
  });
};

import type { APIRoute } from 'astro';

import { canonRoot } from '@/lib/site';
import { apiContractResponseHeaders } from '@/lib/public-surface/api-contract';
import { loadStatusData } from '@/lib/status/load';
import { statusPublicSurfaceSlice } from '@/lib/status/public-surface';
import { buildStatusPublicPayload } from '@/lib/status/public-dto';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(buildStatusPublicPayload(await loadStatusData()));

  return new Response(body, {
    headers: apiContractResponseHeaders(
      statusPublicSurfaceSlice,
      'status:data',
      root,
    ),
  });
};

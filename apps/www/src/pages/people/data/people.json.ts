import type { APIRoute } from 'astro';

import { buildPeoplePayload } from '@/lib/people/discovery';
import { loadPeopleDataWithBacklinks } from '@/lib/people/load';
import { peoplePublicSurfaceSlice } from '@/lib/people/public-surface';
import { apiContractResponseHeaders } from '@/lib/public-surface/api-contract';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(
    buildPeoplePayload(await loadPeopleDataWithBacklinks()),
  );

  return new Response(body, {
    headers: apiContractResponseHeaders(
      peoplePublicSurfaceSlice,
      'people:data',
      root,
    ),
  });
};

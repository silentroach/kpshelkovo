import type { APIRoute } from 'astro';

import { schema } from '@/lib/people/discovery';
import { peoplePublicSurfaceSlice } from '@/lib/people/public-surface';
import { apiContractResponseHeaders } from '@/lib/public-surface/api-contract';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(schema(root));

  return new Response(body, {
    headers: apiContractResponseHeaders(
      peoplePublicSurfaceSlice,
      'people:schema',
      root,
    ),
  });
};

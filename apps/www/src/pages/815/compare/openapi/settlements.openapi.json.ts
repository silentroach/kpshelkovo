import type { APIRoute } from 'astro';

import { OAS, openapi } from '@/compare/lib/discovery';
import { canonRoot } from '@/compare/lib/site';
import { createJsonResponse } from '@/lib/json-response';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();

  return createJsonResponse(openapi(root), {
    headers: {
      'Content-Type': `${OAS}; charset=utf-8`,
    },
  });
};

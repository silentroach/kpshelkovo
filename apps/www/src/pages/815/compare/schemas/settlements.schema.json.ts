import type { APIRoute } from 'astro';

import { schema } from '@/compare/lib/discovery';
import { canonRoot } from '@/compare/lib/site';
import { createJsonResponse } from '@/lib/json-response';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();

  return createJsonResponse(schema(root), {
    headers: {
      'Content-Type': 'application/schema+json; charset=utf-8'
    }
  });
};

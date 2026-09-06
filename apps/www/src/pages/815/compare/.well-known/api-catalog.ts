import type { APIRoute } from 'astro';

import { PROFILE, catalog, self } from '@/compare/lib/discovery';
import { canonRoot } from '@/compare/lib/site';
import { createJsonResponse } from '@/lib/json-response';

export const prerender = true;

function headers(root: string): HeadersInit {
  return {
    'Content-Type': `application/linkset+json; profile="${PROFILE}"`,
    Link: self(root),
  };
}

export const GET: APIRoute = async () => {
  const root = canonRoot();

  return createJsonResponse(catalog(root), {
    headers: headers(root),
  });
};

export const HEAD: APIRoute = async () => {
  const root = canonRoot();

  return new Response(null, {
    headers: headers(root),
  });
};

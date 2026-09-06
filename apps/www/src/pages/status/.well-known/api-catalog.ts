import type { APIRoute } from 'astro';

import { createJsonResponse } from '@/lib/json-response';
import { canonRoot } from '@/lib/site';
import { PROFILE, catalog, self } from '@/lib/status/discovery';

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

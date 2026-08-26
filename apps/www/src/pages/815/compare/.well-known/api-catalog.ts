import type { APIRoute } from 'astro';

import { PROFILE, catalog, self } from '@/compare/lib/discovery';
import { canonRoot } from '@/compare/lib/site';

export const prerender = true;

function headers(root: string): HeadersInit {
  return {
    'Content-Type': `application/linkset+json; profile="${PROFILE}"`,
    Link: self(root),
  };
}

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(catalog(root));

  return new Response(body, {
    headers: headers(root),
  });
};

export const HEAD: APIRoute = async () => {
  const root = canonRoot();

  return new Response(null, {
    headers: headers(root),
  });
};

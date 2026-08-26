import type { APIRoute } from 'astro';

import { build } from '@/compare/lib/skills';

export const prerender = true;

export const GET: APIRoute = async () => {
  const body = JSON.stringify(await build());

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};

import type { APIRoute } from 'astro';

import { buildRatingMd } from '@/compare/lib/markdown';

export const prerender = true;

export const GET: APIRoute = async () =>
  new Response(await buildRatingMd(), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8'
    }
  });

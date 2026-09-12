import type { APIRoute } from 'astro';

import { build } from '../../lib/news/llms';

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(build(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });

import type { APIRoute } from 'astro';

import { build } from '@/lib/llms';

export const prerender = true;

export const GET: APIRoute = async () =>
  new Response(await build('short'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });

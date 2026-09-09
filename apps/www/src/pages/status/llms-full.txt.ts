import type { APIRoute } from 'astro';

import { build } from '@/lib/status/llms';

export const prerender = true;

export const GET: APIRoute = async () =>
  new Response(await build('full'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });

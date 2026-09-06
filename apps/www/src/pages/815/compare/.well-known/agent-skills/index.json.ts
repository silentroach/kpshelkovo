import type { APIRoute } from 'astro';

import { build } from '@/compare/lib/skills';
import { createJsonResponse } from '@/lib/json-response';

export const prerender = true;

export const GET: APIRoute = async () =>
  createJsonResponse(await build(), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

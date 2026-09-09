import type { APIRoute } from 'astro';

import { createJsonResponse } from '@/lib/json-response';
import { build } from '@/lib/skills';

export const prerender = true;

export const GET: APIRoute = async () =>
  createJsonResponse(await build(), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });

import type { APIRoute } from 'astro';

import { buildEventsPublicJsonSchema } from '@/lib/events/public-schema';
import { createJsonResponse } from '@/lib/json-response';
import { canonRoot } from '@/lib/site';

export const prerender = true;
export const GET: APIRoute = () =>
  createJsonResponse(buildEventsPublicJsonSchema(canonRoot()), {
    headers: { 'Content-Type': 'application/schema+json; charset=utf-8' }
  });

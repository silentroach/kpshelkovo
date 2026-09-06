import type { APIRoute } from 'astro';

import { createJsonResponse } from '@/lib/json-response';
import { loadPlaces } from '@/lib/places/load';
import { buildPlaceMapPublicPayload } from '@/lib/places/map-public';

export const prerender = true;

export const GET: APIRoute = async () => {
  const body = buildPlaceMapPublicPayload(await loadPlaces());

  return createJsonResponse(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};

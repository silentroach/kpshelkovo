import type { APIRoute } from 'astro';

import { loadPlaces } from '@/lib/places/load';
import { buildPlaceMapPublicPayload } from '@/lib/places/map-public';

export const prerender = true;

export const GET: APIRoute = async () => {
  const body = buildPlaceMapPublicPayload(await loadPlaces());

  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};

import type { APIRoute } from 'astro';

import { createJsonResponse } from '@/lib/json-response';
import { loadPlaces } from '@/lib/places/load';
import { buildPlaceMapLayerPayload } from '@/lib/places/map-layer-payload';

export const prerender = true;

export const GET = (async () =>
  createJsonResponse(buildPlaceMapLayerPayload(await loadPlaces(), 'club'))) satisfies APIRoute;

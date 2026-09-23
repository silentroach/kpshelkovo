import type { APIRoute } from 'astro';

import { createJsonResponse } from '@/lib/json-response';
import { loadParcelsData } from '@/lib/parcels/load';
import { buildParcelMapPayload } from '@/lib/parcels/map-public';

export const prerender = true;

export const GET: APIRoute = async () =>
  createJsonResponse(buildParcelMapPayload((await loadParcelsData()).parcels), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });

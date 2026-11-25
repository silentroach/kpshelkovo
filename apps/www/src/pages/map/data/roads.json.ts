import type { APIRoute } from 'astro';

import osm from '@/data/road-sources/osm.json';
import { buildRoadMapPayload } from '@/lib/roads/map-public';
import { mapRoadSnapshot } from '@/lib/roads/mapper';
import { shelkovoBoundary } from '@/lib/territory/shelkovo';

export const prerender = true;

// This asset is internal to the map renderer, not a data API.
export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildRoadMapPayload(mapRoadSnapshot(osm), shelkovoBoundary)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });

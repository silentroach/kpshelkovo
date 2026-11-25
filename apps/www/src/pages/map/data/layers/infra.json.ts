import type { APIRoute } from 'astro';

import osm from '@/data/road-sources/osm.json';
import { createJsonResponse } from '@/lib/json-response';
import { loadPlaces } from '@/lib/places/load';
import { buildPlaceMapInfraPayload } from '@/lib/places/map-layer-payload';
import { buildRoadMapPayload } from '@/lib/roads/map-public';
import { mapRoadSnapshot } from '@/lib/roads/mapper';
import { shelkovoBoundary } from '@/lib/territory/shelkovo';

export const prerender = true;

export const GET = (async () =>
  createJsonResponse(
    buildPlaceMapInfraPayload(
      await loadPlaces(),
      buildRoadMapPayload(mapRoadSnapshot(osm), shelkovoBoundary)
    )
  )) satisfies APIRoute;

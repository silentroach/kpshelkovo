import type { APIRoute } from 'astro';

import asphaltAreas from '@/data/road-sources/asphalt-areas.yaml?raw';
import localRoads from '@/data/road-sources/local-roads.yaml?raw';
import osm from '@/data/road-sources/osm.json';
import { createJsonResponse } from '@/lib/json-response';
import { loadPlaces } from '@/lib/places/load';
import { buildPlaceMapLayerPayload } from '@/lib/places/map-layer-payload';
import { parseLocalRoads } from '@/lib/roads/local-mapper';
import { buildRoadMapPayload } from '@/lib/roads/map-public';
import { mapRoadSnapshot } from '@/lib/roads/mapper';
import { buildRoadNetwork } from '@/lib/roads/road-network';
import { shelkovoBoundary } from '@/lib/territory/shelkovo';

export const prerender = true;

export const GET = (async () =>
  createJsonResponse(
    buildPlaceMapLayerPayload(
      await loadPlaces(),
      'infra',
      buildRoadMapPayload(
        buildRoadNetwork(mapRoadSnapshot(osm), parseLocalRoads(localRoads)),
        shelkovoBoundary,
        asphaltAreas
      )
    )
  )) satisfies APIRoute;

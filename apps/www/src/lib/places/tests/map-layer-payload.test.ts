import { describe, expect, it, vi } from 'vitest';

import osm from '@/data/road-sources/osm.json';
import { parseEditorialGeometry } from '@/lib/geometry/editorial-mapper';
import { buildRoadMapPayload } from '@/lib/roads/map-public';
import { mapRoadSnapshot } from '@/lib/roads/mapper';
import { shelkovoBoundary } from '@/lib/territory/shelkovo';
import { GET as getBase } from '@/pages/map/data/layers/base.json';
import { GET as getClub } from '@/pages/map/data/layers/club.json';
import { GET as getInfra } from '@/pages/map/data/layers/infra.json';

import { loadPlaces } from '../load';
import { PlaceMapBasePayloadSchema, PlaceMapInfraPayloadSchema } from '../map-layer-schema';
import { buildPlaceMapPublicPayload } from '../map-public';
import { PlaceMapPublicPayloadSchema } from '../map-public-schema';
import { testPlace } from './place.test-helper';

vi.mock('../load', () => ({ loadPlaces: vi.fn() }));

const geometry = parseEditorialGeometry(
  {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [37.735678912, 55.05] },
        properties: { iconCaption: 'Gate' }
      }
    ]
  },
  'fixture'
);

describe('place map layer routes', () => {
  it('partitions the unchanged place DTOs and indexes only visible optional-layer places', async () => {
    const basePlace = testPlace({ slug: 'ordinary', showOnMap: true, geometry });
    const infraPlace = testPlace({ slug: 'gate', showOnMap: true, mapLayer: 'infra', geometry });
    const clubPlace = testPlace({ slug: 'court', showOnMap: true, mapLayer: 'club', geometry });
    const hidden = testPlace({ slug: 'hidden', showOnMap: false, mapLayer: 'infra', geometry });
    const places = [basePlace, infraPlace, hidden, clubPlace];
    vi.mocked(loadPlaces).mockResolvedValue(places);

    const [base, infra, club] = await Promise.all([
      getBase().then(async (response) => PlaceMapBasePayloadSchema.parse(await response.json())),
      getInfra().then(async (response) => PlaceMapInfraPayloadSchema.parse(await response.json())),
      getClub().then(async (response) => PlaceMapPublicPayloadSchema.parse(await response.json()))
    ]);
    const { places: publicPlaces } = buildPlaceMapPublicPayload(places);

    expect(publicPlaces.map(({ slug }) => slug)).toMatchInlineSnapshot(`
      [
        "ordinary",
        "gate",
        "court",
      ]
    `);
    expect(base.placeLayers).toMatchInlineSnapshot(`
      {
        "court": "club",
        "gate": "infra",
      }
    `);
    expect(base.places).toEqual(publicPlaces.filter(({ mapLayer }) => !mapLayer));
    expect(infra.places).toEqual(publicPlaces.filter(({ mapLayer }) => mapLayer === 'infra'));
    expect(club.places).toEqual(publicPlaces.filter(({ mapLayer }) => mapLayer === 'club'));
    expect(infra.roads).toEqual({
      lines: buildRoadMapPayload(mapRoadSnapshot(osm), shelkovoBoundary).lines
    });
  });

  it('rejects invalid prepared coordinates before emitting an optional-layer file', async () => {
    const place = {
      ...testPlace({ showOnMap: true, mapLayer: 'club' }),
      coordinates: { lat: 91, lng: 0 }
    };
    vi.mocked(loadPlaces).mockResolvedValue([place]);

    await expect(getClub()).rejects.toThrow(/coordinates/u);
  });
});

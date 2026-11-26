import { describe, expect, it, vi } from 'vitest';

import { parseEditorialGeometry } from '@/lib/geometry/editorial-mapper';
import { GET as getBase } from '@/pages/map/data/layers/base.json';
import { GET as getClub } from '@/pages/map/data/layers/club.json';
import { GET as getInfra } from '@/pages/map/data/layers/infra.json';

import { loadPlaces } from '../load';
import { PlaceMapBasePayloadSchema, PlaceMapLayerPayloadSchema } from '../map-layer-schema';
import { buildPlaceMapPublicPayload } from '../map-public';
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
  it('partitions the same place DTOs as the public catalog and indexes visible optional-layer places', async () => {
    const basePlace = testPlace({
      slug: 'ordinary',
      showOnMap: true,
      coordinates: { lng: 37.74689498765, lat: 55.06070312345 },
      geometry
    });
    const infraPlace = testPlace({
      slug: 'gate',
      showOnMap: true,
      mapLayer: 'infra',
      coordinates: { lng: 37.716242, lat: 55.060526 },
      geometry
    });
    const clubPlace = testPlace({ slug: 'court', showOnMap: true, mapLayer: 'club', geometry });
    const hidden = testPlace({ slug: 'hidden', showOnMap: false, mapLayer: 'infra', geometry });
    const places = [basePlace, infraPlace, hidden, clubPlace];
    vi.mocked(loadPlaces).mockResolvedValue(places);

    const [base, infra, club] = await Promise.all([
      getBase().then(async (response) => PlaceMapBasePayloadSchema.parse(await response.json())),
      getInfra().then(async (response) => PlaceMapLayerPayloadSchema.parse(await response.json())),
      getClub().then(async (response) => PlaceMapLayerPayloadSchema.parse(await response.json()))
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
        "club": [
          "court",
        ],
        "infra": [
          "gate",
        ],
      }
    `);
    expect(base.places).toEqual(publicPlaces.filter(({ mapLayer }) => !mapLayer));
    expect(infra.places).toEqual(publicPlaces.filter(({ mapLayer }) => mapLayer === 'infra'));
    expect(club.places).toEqual(publicPlaces.filter(({ mapLayer }) => mapLayer === 'club'));
    expect(base.places[0]?.coordinates).toEqual([37.74689499, 55.06070312]);
    expect(infra.places[0]?.coordinates).toEqual([37.716242, 55.060526]);
    expect(infra.roads?.gravel.length).toBeGreaterThan(0);
    expect(club).not.toHaveProperty('roads');
  });

  it.each([
    { lng: 181, lat: 0 },
    { lng: 0, lat: 91 },
    { lng: Infinity, lat: 0 }
  ])(
    'rejects invalid coordinates %j before emitting an optional-layer file',
    async (coordinates) => {
      const place = {
        ...testPlace({ showOnMap: true, mapLayer: 'club' }),
        coordinates
      };
      vi.mocked(loadPlaces).mockResolvedValue([place]);

      await expect(getClub()).rejects.toThrow(/coordinates/u);
    }
  );
});

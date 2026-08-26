import { describe, expect, it } from 'vitest';

import type { PlaceMapItem } from '@/lib/places/map-types';

import {
  createMapFeatures,
  getMarkerScale,
  getPaddedBounds,
  getPlaceBounds,
  toMapGeometry,
} from '../place-map-geometry';

const place = (slug: string, lng: number, lat: number): PlaceMapItem => ({
  slug,
  name: slug,
  status: 'existing',
  coordinates: { lng, lat },
  url: `/map/${slug}/`,
});

describe('place map geometry', () => {
  it('uses settlement bounds until multiple places define a useful extent', () => {
    expect(getPlaceBounds([place('burzhuyka', 37.716242, 55.060526)]))
      .toMatchInlineSnapshot(`
        [
          [
            37.708,
            55.049,
          ],
          [
            37.764,
            55.081,
          ],
        ]
      `);
  });

  it('pads and rounds a multi-place extent deterministically', () => {
    expect(
      getPaddedBounds([
        [37.716242, 55.060526],
        [37.746894, 55.060703],
      ]),
    ).toMatchInlineSnapshot(`
      [
        [
          37.707046,
          55.060473,
        ],
        [
          37.75609,
          55.060756,
        ],
      ]
    `);
  });

  it('scales marker graphics across overview and close-up zoom levels', () => {
    expect(
      [13.5, 15, 16, 17, 18, 19].map((zoom) => getMarkerScale(zoom).toFixed(3)),
    ).toMatchInlineSnapshot(`
      [
        "0.625",
        "0.850",
        "1.000",
        "1.150",
        "1.300",
        "1.300",
      ]
    `);
  });

  it('adapts place geometry and coordinates to Yandex Maps features', () => {
    const places = [
      place('burzhuyka', 37.716242, 55.060526),
      place('titanic', 37.746894, 55.060703),
    ];

    expect({
      multiPolygon: toMapGeometry({
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [37.74, 55.05],
              [37.75, 55.05],
              [37.74, 55.05],
            ],
          ],
        ],
      }),
      polygon: toMapGeometry({
        type: 'Polygon',
        coordinates: [
          [
            [37.71, 55.06],
            [37.72, 55.06],
            [37.71, 55.06],
          ],
        ],
      }),
      features: createMapFeatures(places),
    }).toMatchInlineSnapshot(`
      {
        "features": [
          {
            "geometry": {
              "coordinates": [
                37.716242,
                55.060526,
              ],
              "type": "Point",
            },
            "id": "burzhuyka",
            "type": "Feature",
          },
          {
            "geometry": {
              "coordinates": [
                37.746894,
                55.060703,
              ],
              "type": "Point",
            },
            "id": "titanic",
            "type": "Feature",
          },
        ],
        "multiPolygon": {
          "coordinates": [
            [
              [
                [
                  37.74,
                  55.05,
                ],
                [
                  37.75,
                  55.05,
                ],
                [
                  37.74,
                  55.05,
                ],
              ],
            ],
          ],
          "type": "MultiPolygon",
        },
        "polygon": {
          "coordinates": [
            [
              [
                37.71,
                55.06,
              ],
              [
                37.72,
                55.06,
              ],
              [
                37.71,
                55.06,
              ],
            ],
          ],
          "type": "Polygon",
        },
      }
    `);
  });
});

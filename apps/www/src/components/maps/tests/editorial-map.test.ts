// @vitest-environment happy-dom
import type { YMapFeatureProps, YMapMarkerProps } from '@yandex/ymaps3-types';
import { afterEach, expect, it, vi } from 'vitest';

import { fromPublicEditorialGeometry } from '@/components/places/place-map-geometry';
import { EditorialMapDataSchema } from '@/lib/geometry/editorial-map-data-schema';
import { parseEditorialGeometry } from '@/lib/geometry/editorial-mapper';
import { toPublicEditorialGeometry } from '@/lib/geometry/editorial-public';
import { EditorialPublicGeometrySchema } from '@/lib/geometry/editorial-public-schema';
import type { EditorialFeatureCollection } from '@/lib/geometry/editorial-types';

import { createEditorialMapObjects, getEditorialMapBounds } from '../editorial-map';

const collection = (
  features: EditorialFeatureCollection['features']
): EditorialFeatureCollection => ({
  type: 'FeatureCollection',
  features
});

const setupSdk = () => {
  const marker = vi.fn(function (_props: YMapMarkerProps, _element: HTMLElement) {});
  const feature = vi.fn(function (_props: YMapFeatureProps) {});
  vi.stubGlobal('ymaps3', { YMapMarker: marker, YMapFeature: feature });
  return { marker, feature };
};

afterEach(() => vi.unstubAllGlobals());

it.each(['top', 'right', 'bottom', 'left', undefined] as const)(
  'preserves caption side %s without moving the anchor or adding a default',
  (captionPosition) => {
    for (const captionOnly of [true, false]) {
      const sdk = setupSdk();
      const domain = parseEditorialGeometry(
        {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [37, 55] },
              properties: { iconCaption: 'Gate', captionOnly, captionPosition }
            }
          ]
        },
        'caption-position.geojson'
      );
      const html = EditorialMapDataSchema.parse(JSON.parse(JSON.stringify(domain)));
      const serialized = JSON.stringify(toPublicEditorialGeometry(html));
      const published = EditorialPublicGeometrySchema.parse(JSON.parse(serialized));
      const client = fromPublicEditorialGeometry(published);
      expect([
        html.features[0]?.captionPosition,
        published.features[0]?.properties.captionPosition,
        client.features[0]?.captionPosition
      ]).toEqual([captionPosition, captionPosition, captionPosition]);
      if (captionPosition === undefined) expect(serialized).not.toContain('captionPosition');
      createEditorialMapObjects(window.ymaps3!, client);
      expect(sdk.marker.mock.calls[0]?.[0].coordinates).toEqual([37, 55]);
      expect(sdk.marker.mock.calls[0]?.[1].dataset.captionPosition).toBe(captionPosition);
      expect(getEditorialMapBounds(client)).toEqual(
        getEditorialMapBounds(
          collection([{ type: 'Feature', geometry: { type: 'Point', coordinates: [37, 55] } }])
        )
      );
    }
  }
);

it.each([
  {
    geometry: { type: 'Point', coordinates: [37, 55] },
    iconCaption: 'Gate',
    captionPosition: 'diagonal'
  },
  {
    geometry: { type: 'Point', coordinates: [37, 55] },
    iconCaption: undefined,
    captionPosition: 'left'
  },
  { geometry: { type: 'Point', coordinates: [37, 55] }, iconCaption: '  ', captionPosition: 'top' },
  {
    geometry: {
      type: 'LineString',
      coordinates: [
        [37, 55],
        [38, 56]
      ]
    },
    iconCaption: 'Gate',
    captionPosition: 'right'
  }
])(
  'rejects invalid caption placement at every boundary: %j',
  ({ geometry, iconCaption, captionPosition }) => {
    const raw = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', id: 'gate', geometry, properties: { iconCaption, captionPosition } }
      ]
    };
    expect(() => parseEditorialGeometry(raw, 'placement.geojson')).toThrow(
      /placement\.geojson.*captionPosition.*gate/
    );
    expect(EditorialPublicGeometrySchema.safeParse(raw).success).toBe(false);
    expect(
      EditorialMapDataSchema.safeParse({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry, iconCaption, captionPosition }]
      }).success
    ).toBe(false);
  }
);

it.each([true, false, undefined])(
  'preserves captionOnly %s through every map boundary',
  (captionOnly) => {
    const sdk = setupSdk();
    const text = ' <b>Проход</b> **к парку** ';
    const domain = parseEditorialGeometry(
      {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [37, 55] },
            properties: { captionOnly, iconCaption: text }
          }
        ]
      },
      'caption.geojson'
    );
    const htmlData = EditorialMapDataSchema.parse(JSON.parse(JSON.stringify(domain)));
    const publicData = toPublicEditorialGeometry(htmlData);
    const clientData = fromPublicEditorialGeometry(publicData);
    expect([
      htmlData.features[0]?.captionOnly,
      publicData.features[0]?.properties.captionOnly,
      clientData.features[0]?.captionOnly
    ]).toEqual([captionOnly, captionOnly, captionOnly]);
    createEditorialMapObjects(window.ymaps3!, clientData);
    const node = sdk.marker.mock.calls[0]![1];
    expect(Boolean(node.querySelector('.editorial-map-marker__dot'))).toBe(!captionOnly);
    expect(node.textContent).toBe(text);
    expect(node.querySelector('b, strong')).toBeFalsy();
  }
);

it.each([
  {
    geometry: {
      type: 'LineString',
      coordinates: [
        [37, 55],
        [38, 56]
      ]
    },
    captionOnly: true,
    iconCaption: 'Проход'
  },
  {
    geometry: {
      type: 'LineString',
      coordinates: [
        [37, 55],
        [38, 56]
      ]
    },
    captionOnly: false,
    iconCaption: 'Проход'
  },
  { geometry: { type: 'Point', coordinates: [37, 55] }, captionOnly: true },
  { geometry: { type: 'Point', coordinates: [37, 55] }, captionOnly: true, iconCaption: '  ' },
  {
    geometry: { type: 'Point', coordinates: [37, 55] },
    captionOnly: true,
    iconCaption: 'Проход',
    iconContent: '1'
  },
  {
    geometry: { type: 'Point', coordinates: [37, 55] },
    captionOnly: true,
    iconCaption: 'Проход',
    iconContent: '19'
  }
])(
  'rejects invalid caption-only data at each boundary: %j',
  ({ geometry, captionOnly, iconCaption, iconContent }) => {
    const raw = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'caption',
          geometry,
          properties: { captionOnly, iconCaption, iconContent }
        }
      ]
    };
    expect(() => parseEditorialGeometry(raw, 'caption.geojson')).toThrow(
      /caption\.geojson.*captionOnly.*caption/
    );
    expect(EditorialPublicGeometrySchema.safeParse(raw).success).toBe(false);
    expect(
      EditorialMapDataSchema.safeParse({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry, captionOnly, iconCaption, iconContent }]
      }).success
    ).toBe(false);
  }
);

it('draws ordinary points with only explicit text labels, no HTML or popup', () => {
  const sdk = setupSdk();
  const text = '<img src=x onerror=alert(1)> **пруд**';
  createEditorialMapObjects(
    window.ymaps3!,
    collection([
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [37.7, 55.1] },
        markerColor: '#123456',
        iconCaption: text,
        description: '<script>alert(1)</script>'
      },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [37.8, 55.2] } }
    ])
  );

  expect(sdk.marker.mock.calls.map(([props]) => props)).toMatchInlineSnapshot(`
    [
      {
        "coordinates": [
          37.7,
          55.1,
        ],
        "zIndex": 1,
      },
      {
        "coordinates": [
          37.8,
          55.2,
        ],
        "zIndex": 0,
      },
    ]
  `);
  expect(sdk.feature).not.toHaveBeenCalled();
  const node = sdk.marker.mock.calls[0]![1];
  expect(node.textContent).toBe(text);
  expect(node.querySelector('img, script, a, button')).toBeFalsy();
  const dot = node.querySelector('.editorial-map-marker__dot.ui-map-marker');
  expect(dot?.getAttribute('style')).toContain('--ui-map-marker-color: #123456');
  expect(sdk.marker.mock.calls[1]![1].querySelector('.ui-map-marker')?.hasAttribute('style')).toBe(
    false
  );
  expect(sdk.marker.mock.calls[1]![1].textContent).toBe('');
});

it.each(['0', '2', '19', '99'])(
  'renders point number %s literally without replacing the caption or ordinary dot',
  (iconContent) => {
    const sdk = setupSdk();
    const raw = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [37, 55] },
          properties: { iconContent, iconCaption: 'Съезд', 'marker-color': '#1e98ff' }
        },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [38, 56] }, properties: {} }
      ]
    };
    createEditorialMapObjects(
      window.ymaps3!,
      fromPublicEditorialGeometry(
        toPublicEditorialGeometry(parseEditorialGeometry(raw, 'place.geojson'))
      )
    );

    const [numbered, ordinary] = sdk.marker.mock.calls.map(([, element]) => element);
    expect(sdk.marker.mock.calls.map(([props]) => props.zIndex)).toMatchInlineSnapshot(`
      [
        1,
        0,
      ]
    `);
    expect(numbered?.querySelector('.editorial-map-marker__dot.ui-map-marker')?.textContent).toBe(
      iconContent
    );
    expect(numbered?.querySelector('.editorial-map-marker__dot')?.childElementCount).toBe(0);
    expect(numbered?.querySelector('.editorial-map-marker__dot')?.getAttribute('style')).toContain(
      '--ui-map-marker-color: #1e98ff'
    );
    expect(numbered?.querySelector('.editorial-map-marker__caption')?.textContent).toBe('Съезд');
    expect(ordinary?.querySelector('.editorial-map-marker__dot')?.textContent).toBe('');
    expect(ordinary?.querySelector('.editorial-map-marker__caption')).toBeFalsy();
  }
);

it('passes line, polygon and multi-polygon geometry and domain styling to SDK', () => {
  const sdk = setupSdk();
  const outer = [
    [37, 55],
    [38, 55],
    [37, 55]
  ] as const;
  const hole = [
    [37.2, 55.1],
    [37.4, 55.1],
    [37.2, 55.1]
  ] as const;
  createEditorialMapObjects(
    window.ymaps3!,
    collection([
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: outer },
        stroke: '#abcdef',
        strokeWidth: 2.5,
        strokeOpacity: 0,
        strokeDasharray: [6, 3],
        description: 'Not a popup'
      },
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [outer, hole] },
        fill: '#123456',
        fillOpacity: 0.2,
        stroke: '#654321',
        precision: 'approximate'
      },
      {
        type: 'Feature',
        geometry: { type: 'MultiPolygon', coordinates: [[outer, hole], [outer]] },
        stroke: '#ffffff'
      }
    ])
  );

  expect(sdk.marker).not.toHaveBeenCalled();
  const geometries = sdk.feature.mock.calls.map(([props]) => props.geometry);
  expect(geometries[0]).toMatchObject({ type: 'LineString', coordinates: outer });
  expect(geometries[1]).toMatchObject({ type: 'Polygon', coordinates: [outer, hole] });
  expect(geometries[2]).toMatchObject({
    type: 'MultiPolygon',
    coordinates: [[outer, hole], [outer]]
  });
  expect(
    sdk.feature.mock.calls.map(([{ style }]) => ({
      fill: style?.fill,
      fillOpacity: style?.fillOpacity,
      fillRule: style?.fillRule,
      stroke: style?.stroke?.[0],
      interactive: style?.interactive
    }))
  ).toMatchInlineSnapshot(`
    [
      {
        "fill": undefined,
        "fillOpacity": undefined,
        "fillRule": "evenodd",
        "interactive": false,
        "stroke": {
          "color": "#abcdef",
          "dash": [
            6,
            3,
          ],
          "opacity": 0,
          "width": 2.5,
        },
      },
      {
        "fill": "#123456",
        "fillOpacity": 0.2,
        "fillRule": "evenodd",
        "interactive": false,
        "stroke": {
          "color": "#654321",
        },
      },
      {
        "fill": undefined,
        "fillOpacity": undefined,
        "fillRule": "evenodd",
        "interactive": false,
        "stroke": {
          "color": "#ffffff",
        },
      },
    ]
  `);
  expect(sdk.feature.mock.calls.every(([props]) => !props.onClick && !props.properties)).toBe(true);
});

it('omits absent SDK style properties for solid geometry, and keeps explicit dash arrays', () => {
  const sdk = setupSdk();
  const ring = [
    [37, 55],
    [38, 55],
    [37, 55]
  ] as const;
  createEditorialMapObjects(
    window.ymaps3!,
    collection([
      { type: 'Feature', geometry: { type: 'LineString', coordinates: ring }, stroke: '#123456' },
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: ring },
        stroke: '#123456',
        strokeDasharray: [3, 1]
      },
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, stroke: '#abcdef' },
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [ring] },
        stroke: '#abcdef',
        strokeDasharray: [5, 2]
      },
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, fill: '#ffffff' }
    ])
  );

  const [solidLine, dashedLine, solidArea, dashedArea, filledArea] = sdk.feature.mock.calls.map(
    ([props]) => props.style!
  );
  expect(Object.hasOwn(solidLine, 'fill')).toBe(false);
  expect(Object.hasOwn(solidLine.stroke![0]!, 'dash')).toBe(false);
  expect(dashedLine.stroke?.[0]?.dash).toEqual([3, 1]);
  expect(Object.hasOwn(solidArea.stroke![0]!, 'dash')).toBe(false);
  expect(dashedArea.stroke?.[0]?.dash).toEqual([5, 2]);
  expect(Object.hasOwn(filledArea, 'stroke')).toBe(false);
  expect(Object.hasOwn(filledArea, 'fillOpacity')).toBe(false);
});

it('renders visible point labels verbatim without interpreting markup-like characters', () => {
  const sdk = setupSdk();
  const text = 'Шелково Ривер п. № 1 <b>ворота</b> & <img src=x>';
  const item = {
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [37, 55] as const },
    iconCaption: text
  };
  createEditorialMapObjects(window.ymaps3!, collection([item]));

  const caption = sdk.marker.mock.calls[0]?.[1].querySelector('.editorial-map-marker__caption');
  expect(caption?.textContent).toBe(text);
  expect(caption?.querySelector('b, img')).toBeFalsy();
  expect(item.iconCaption).toBe(text);
});

it('frames a single point, line and separate areas without a primary place marker', () => {
  const point = collection([
    { type: 'Feature', geometry: { type: 'Point', coordinates: [37, 55] } }
  ]);
  const line = collection([
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [37, 55],
          [38, 56]
        ]
      }
    }
  ]);
  const areas = collection([
    {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [37, 55],
              [37.2, 55],
              [37, 55]
            ]
          ],
          [
            [
              [38, 56],
              [38.2, 56],
              [38, 56]
            ]
          ]
        ]
      }
    }
  ]);
  expect({
    point: getEditorialMapBounds(point),
    line: getEditorialMapBounds(line),
    areas: getEditorialMapBounds(areas),
    withPrimaryPoint: getEditorialMapBounds(line, [[36, 54]])
  }).toMatchInlineSnapshot(`
    {
      "areas": [
        [
          36.64,
          54.7,
        ],
        [
          38.56,
          56.3,
        ],
      ],
      "line": [
        [
          36.7,
          54.7,
        ],
        [
          38.3,
          56.3,
        ],
      ],
      "point": [
        [
          36.999,
          54.999,
        ],
        [
          37.001,
          55.001,
        ],
      ],
      "withPrimaryPoint": [
        [
          35.4,
          53.4,
        ],
        [
          38.6,
          56.6,
        ],
      ],
    }
  `);
  expect(getEditorialMapBounds(collection([]))).toBeUndefined();
  expect(getEditorialMapBounds(point, [], 0.15)).toEqual(getEditorialMapBounds(point));
});

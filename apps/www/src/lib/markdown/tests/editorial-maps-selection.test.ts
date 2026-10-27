import { parseMarkdownFragment } from '@shelkovo/markdown';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import { EditorialMapDataSchema } from '@/lib/geometry/editorial-map-data-schema';
import { createEditorialMapSelectionResolver } from '@/lib/geometry/editorial-map-selection';
import { toPublicEditorialGeometry } from '@/lib/geometry/editorial-public';
import { RawEditorialGeometrySchema } from '@/lib/geometry/editorial-schema';
import type { EditorialFeatureCollection } from '@/lib/geometry/editorial-types';
import { mapRawSelectionSet } from '@/lib/map-selection-sets/mapper';
import { toMapSelectionSetPublicDto } from '@/lib/map-selection-sets/public';
import { mapSelectionSetRawSchema } from '@/lib/map-selection-sets/raw-schema';

import { extractEditorialMaps, hasEditorialMapReferences } from '../editorial-maps';
import { appendEditorialMapCaptions } from '../editorial-maps-companion';
import type { EditorialMapSelectionResolver } from '../editorial-maps.types';
import { preprocessSiteMarkdown, renderMarkdown } from '../render';

const fence = (input: unknown, url?: string): string =>
  `\`\`\`map${url ? ` ${url}` : ''}\n${JSON.stringify(input)}\n\`\`\``;

const ownFeature = {
  type: 'Feature',
  properties: { 'stroke-width': '2', precision: 'approximate', outline_expansion_meters: 2 },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [37.123456789, 55],
        [37.13, 55],
        [37.13, 55.01],
        [37.123456789, 55]
      ]
    ]
  }
};

const imported: EditorialFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      iconCaption: 'Place',
      geometry: { type: 'Point', coordinates: [38.12345678, 56] }
    }
  ]
};

const resolver: EditorialMapSelectionResolver = () => ({
  geometry: imported,
  parcelLabels: [{ text: 'A1', coordinates: [38, 56] }]
});

describe('short editorial maps', () => {
  it('publishes the same prepared numbered set route and authored line in HTML and companion', () => {
    const set = toMapSelectionSetPublicDto(
      mapRawSelectionSet(
        'route',
        mapSelectionSetRawSchema.parse({
          places: ['finish'],
          features: [
            {
              type: 'Feature',
              properties: { iconContent: '19', iconCaption: 'Finish', 'marker-color': '#123456' },
              geometry: { type: 'Point', coordinates: [37.123456789, 55.123456789] }
            },
            {
              type: 'Feature',
              properties: { stroke: '#654321', 'stroke-width': 4 },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [37, 55],
                  [37.123456789, 55.123456789]
                ]
              }
            }
          ]
        })
      )
    );
    const ready = createEditorialMapSelectionResolver({
      parcels: [],
      places: [
        {
          slug: 'finish',
          name: 'Park',
          showOnMap: true,
          coordinates: { lng: 37.12345678, lat: 55.12345678 }
        }
      ],
      sets: [set]
    });
    const body = fence({
      sets: ['route', 'route'],
      features: [
        {
          type: 'Feature',
          properties: { stroke: '#abcdef' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [38, 56],
              [38.1, 56.1]
            ]
          }
        }
      ]
    });
    const page = new Window().document;
    page.body.innerHTML = renderMarkdown(body, {
      editorialMaps: true,
      editorialMapResolver: ready
    });
    const html = EditorialMapDataSchema.parse(
      JSON.parse(page.querySelector('editorial-map')?.getAttribute('data-geometry') ?? '')
    );
    const code = appendEditorialMapCaptions(parseMarkdownFragment(body), 'article', ready)[0];
    if (code?.type !== 'code') throw new Error('missing code');
    const companion = RawEditorialGeometrySchema.parse(JSON.parse(code.value));
    expect(companion.features).toEqual(toPublicEditorialGeometry(html).features);
    expect(companion.features.slice(1, 3)).toEqual(set.geometry?.features);
    expect(
      companion.features.map((feature) => ({
        geometry: feature.geometry,
        properties: feature.properties
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "geometry": {
            "coordinates": [
              37.12345678,
              55.12345678,
            ],
            "type": "Point",
          },
          "properties": {
            "iconCaption": "Park",
            "marker-color": "#7c3aed",
          },
        },
        {
          "geometry": {
            "coordinates": [
              37.12345679,
              55.12345679,
            ],
            "type": "Point",
          },
          "properties": {
            "iconCaption": "Finish",
            "iconContent": "19",
            "marker-color": "#123456",
          },
        },
        {
          "geometry": {
            "coordinates": [
              [
                37,
                55,
              ],
              [
                37.12345679,
                55.12345679,
              ],
            ],
            "type": "LineString",
          },
          "properties": {
            "stroke": "#654321",
            "stroke-width": 4,
          },
        },
        {
          "geometry": {
            "coordinates": [
              [
                38,
                56,
              ],
              [
                38.1,
                56.1,
              ],
            ],
            "type": "LineString",
          },
          "properties": {
            "stroke": "#abcdef",
          },
        },
      ]
    `);
  });

  it('parses reference-only and mixed maps independently of datasets and resolution', () => {
    const maps = extractEditorialMaps(
      `${fence({ sets: ['parent'] })}\n\n${fence({ type: 'FeatureCollection', sets: ['parent'], parcels: ['SHP-A1'], places: ['place'], features: [ownFeature], metadata: { name: '@unknown' }, outline: true }, 'https://example.com/map')}`,
      'article'
    );
    expect(
      maps.map((map) => ({
        selection: map.selection,
        ownFeatures: map.geometry.features.length,
        url: map.url,
        name: map.geometry.metadata?.name
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "name": undefined,
          "ownFeatures": 0,
          "selection": {
            "outline": false,
            "parcels": [],
            "places": [],
            "sets": [
              "parent",
            ],
          },
          "url": undefined,
        },
        {
          "name": "@unknown",
          "ownFeatures": 1,
          "selection": {
            "outline": true,
            "parcels": [
              "SHP-A1",
            ],
            "places": [
              "place",
            ],
            "sets": [
              "parent",
            ],
          },
          "url": "https://example.com/map",
        },
      ]
    `);
  });

  it.each([
    {},
    { sets: [] },
    { sets: [''] },
    { sets: ['ok'], unexpected: true },
    { features: [{ ...ownFeature, properties: { unknown: true } }] }
  ])('rejects invalid definitions with context: %j', (input) => {
    expect(() =>
      extractEditorialMaps(`${fence({ sets: ['valid'] })}\n\n${fence(input)}`, 'kb page')
    ).toThrow(/kb page map insertion 2/);
  });

  it('detects references using real AST code nodes, without treating strings as mentions', () => {
    const body = `> ${fence({ places: ['@unknown'], metadata: { name: '@unknown' } }).replaceAll('\n', '\n> ')}`;
    expect(hasEditorialMapReferences(body, 'article')).toBe(true);
    expect(hasEditorialMapReferences('Plain `sets` text', 'article')).toBe(false);
    expect(
      hasEditorialMapReferences(
        fence({ type: 'FeatureCollection', features: [ownFeature] }),
        'article'
      )
    ).toBe(false);
    expect(
      preprocessSiteMarkdown(body, { mentions: { registry: new Map(), context: 'article' } })
        .mentions
    ).toEqual([]);
  });

  it('renders combined prepared geometry and separate labels through a synchronous injected resolver', () => {
    const body = fence({
      sets: ['parent'],
      features: [ownFeature],
      metadata: { name: 'Scheme' },
      outline: true
    });
    const calls: unknown[] = [];
    const page = new Window().document;
    page.body.innerHTML = renderMarkdown(body, {
      editorialMaps: true,
      mentions: { registry: new Map(), context: 'article' },
      editorialMapResolver: (selection, context) => {
        calls.push({ selection, context });
        return resolver(selection, context);
      }
    });
    const host = page.querySelector('editorial-map');
    const geometry = JSON.parse(host?.getAttribute('data-geometry') ?? '');
    expect(geometry.features).toHaveLength(2);
    expect(geometry.features[0]).toEqual(imported.features[0]);
    expect(geometry.features[1].geometry.coordinates).not.toEqual(ownFeature.geometry.coordinates);
    expect(JSON.parse(host?.getAttribute('data-parcel-labels') ?? '')).toEqual([
      { text: 'A1', coordinates: [38, 56] }
    ]);
    expect(page.querySelector('figcaption a:not(.ui-heading-anchor)')).toBeFalsy();
    expect(calls).toMatchInlineSnapshot(`
      [
        {
          "context": "article map insertion 1",
          "selection": {
            "outline": true,
            "parcels": [],
            "places": [],
            "sets": [
              "parent",
            ],
          },
        },
      ]
    `);
  });

  it('does not require a resolver for own-only short geometry', () => {
    const body = fence({ features: [ownFeature] });
    expect(renderMarkdown(body, { editorialMaps: true })).toContain('<editorial-map');
    expect(appendEditorialMapCaptions(parseMarkdownFragment(body), 'article')[0]?.type).toBe(
      'code'
    );
  });

  it('keeps prepared imported contours and ready outline features unchanged', () => {
    const geometry: EditorialFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          precision: 'approximate',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [37.12345678, 55],
                [37.13, 55],
                [37.13, 55.01],
                [37.12345678, 55]
              ]
            ]
          }
        },
        {
          type: 'Feature',
          strokeWidth: 5,
          geometry: {
            type: 'LineString',
            coordinates: [
              [37.12345678, 55],
              [37.13, 55]
            ]
          }
        }
      ]
    };
    const ready: EditorialMapSelectionResolver = () => ({ geometry, parcelLabels: [] });
    const body = fence({ sets: ['parent'], outline: true });
    const page = new Window().document;
    page.body.innerHTML = renderMarkdown(body, {
      editorialMaps: true,
      editorialMapResolver: ready
    });
    const htmlGeometry = EditorialMapDataSchema.parse(
      JSON.parse(page.querySelector('editorial-map')?.getAttribute('data-geometry') ?? '')
    );
    const code = appendEditorialMapCaptions(parseMarkdownFragment(body), 'article', ready)[0];
    if (code?.type !== 'code') throw new Error('missing code');
    const published = RawEditorialGeometrySchema.parse(JSON.parse(code.value));
    expect(htmlGeometry.features.map((feature) => feature.geometry)).toEqual(
      geometry.features.map((feature) => feature.geometry)
    );
    expect(published.features.map((feature) => feature.geometry)).toEqual(
      geometry.features.map((feature) => feature.geometry)
    );
    expect(code.value).not.toContain('outline_expansion_meters');
  });

  it('rejects missing resolvers in HTML and companion instead of publishing partial geometry', () => {
    const body = fence({ sets: ['parent'], features: [ownFeature] });
    expect(() => renderMarkdown(body, { editorialMaps: true })).toThrow(
      /site markdown map insertion 1.*resolver/
    );
    expect(() =>
      renderMarkdown(body, { editorialMaps: true, editorialMapSource: 'news/example' })
    ).toThrow(/news\/example map insertion 1.*resolver/);
    expect(() => appendEditorialMapCaptions(parseMarkdownFragment(body), 'article')).toThrow(
      /article map insertion 1.*resolver/
    );
  });

  it('rejects empty resolution and invalid final labels before either publication', () => {
    const body = fence({ sets: ['parent'] });
    const empty: EditorialMapSelectionResolver = () => ({
      geometry: { type: 'FeatureCollection', features: [] },
      parcelLabels: []
    });
    const invalidLabels: EditorialMapSelectionResolver = () => ({
      geometry: imported,
      parcelLabels: [{ text: 'A1', coordinates: [181, 55] }]
    });
    for (const resolve of [empty, invalidLabels]) {
      expect(() =>
        renderMarkdown(body, { editorialMaps: true, editorialMapResolver: resolve })
      ).toThrow(/map insertion 1.*invalid resolved map/);
      expect(() =>
        appendEditorialMapCaptions(parseMarkdownFragment(body), 'article', resolve)
      ).toThrow(/article map insertion 1.*invalid resolved map/);
    }
  });

  it('expands companions without reprocessing imported geometry or changing own boundaries and properties', () => {
    const body = fence(
      {
        sets: ['internal'],
        parcels: ['SHP-A1'],
        places: ['place-id'],
        outline: true,
        metadata: { name: 'Scheme' },
        features: [ownFeature]
      },
      'https://example.com/map'
    );
    const create = () =>
      appendEditorialMapCaptions(parseMarkdownFragment(body), 'article', resolver);
    const nodes = create();
    const code = nodes[0];
    if (code?.type !== 'code') throw new Error('missing code');
    const published = JSON.parse(code.value);
    expect({
      type: published.type,
      metadata: published.metadata,
      features: published.features,
      url: code.meta,
      caption: nodes[1]
    }).toMatchInlineSnapshot(`
      {
        "caption": {
          "children": [
            {
              "children": [
                {
                  "type": "text",
                  "value": "Scheme",
                },
              ],
              "title": undefined,
              "type": "link",
              "url": "https://example.com/map",
            },
          ],
          "type": "paragraph",
        },
        "features": [
          {
            "geometry": {
              "coordinates": [
                38.12345678,
                56,
              ],
              "type": "Point",
            },
            "properties": {
              "iconCaption": "Place",
            },
            "type": "Feature",
          },
          {
            "geometry": {
              "coordinates": [
                38,
                56,
              ],
              "type": "Point",
            },
            "properties": {
              "iconCaption": "A1",
            },
            "type": "Feature",
          },
          {
            "geometry": {
              "coordinates": [
                [
                  [
                    37.12345679,
                    55,
                  ],
                  [
                    37.13,
                    55,
                  ],
                  [
                    37.13,
                    55.01,
                  ],
                  [
                    37.12345679,
                    55,
                  ],
                ],
              ],
              "type": "Polygon",
            },
            "properties": {
              "outline_expansion_meters": 2,
              "precision": "approximate",
              "stroke-width": "2",
            },
            "type": "Feature",
          },
        ],
        "metadata": {
          "name": "Scheme",
        },
        "type": "FeatureCollection",
        "url": "https://example.com/map",
      }
    `);
    expect(code.value).not.toMatch(/internal|SHP-A1|place-id|"outline"/);
    expect(create()).toEqual(nodes);
    expect(body).toContain('37.123456789');
    expect(body).toContain('"sets":["internal"]');
  });
});

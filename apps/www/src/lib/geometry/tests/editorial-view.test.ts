import { expect, it } from 'vitest';

import type { EditorialFeatureCollection } from '../editorial-types';
import { prepareEditorialGeometry } from '../editorial-view';

it('prepares only visible point captions without changing the source geometry or hidden text', () => {
  const text = 'Шелково Ривер п. № 1 "Ворота" <b>@unknown</b> **пруд**';
  const point = {
    type: 'Feature',
    id: 0,
    geometry: { type: 'Point', coordinates: [37, 55] },
    iconCaption: text,
    iconContent: '1',
    markerColor: '#123456',
    description: text
  } as const;
  const unlabelled = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [38, 56] },
    description: text
  } as const;
  const line = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [point.geometry.coordinates, unlabelled.geometry.coordinates]
    },
    iconCaption: text,
    description: text,
    stroke: '#123456',
    strokeDasharray: [3, 2]
  } as const;
  const source: EditorialFeatureCollection = {
    type: 'FeatureCollection',
    metadata: { name: text, description: text, creator: '@unknown' },
    features: [point, unlabelled, line]
  };
  const original = structuredClone(source);

  const prepared = prepareEditorialGeometry(source);
  const caption = prepared.features[0]?.iconCaption;

  expect(caption?.replaceAll('\u00a0', '·').replaceAll('\u202f', '·')).toMatchInlineSnapshot(
    `"Шелково·Ривер п.·№·1 «Ворота» <b>@unknown</b> **пруд**"`
  );
  expect(prepared).toEqual({
    ...original,
    features: [
      {
        ...point,
        iconCaption: caption
      },
      unlabelled,
      line
    ]
  });
  expect(source).toEqual(original);
});

it('accepts an empty collection', () => {
  expect(prepareEditorialGeometry({ type: 'FeatureCollection', features: [] }))
    .toMatchInlineSnapshot(`
      {
        "features": [],
        "type": "FeatureCollection",
      }
    `);
});

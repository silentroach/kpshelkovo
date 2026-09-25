import { expect, it } from 'vitest';

import { prepareEditorialGeometry } from '../editorial-display';
import { parseEditorialGeometry } from '../editorial-mapper';

it('prepares only visible point captions without modifying the original geometry', () => {
  const source = parseEditorialGeometry(
    {
      type: 'FeatureCollection',
      metadata: { description: '"Шелково Ривер"' },
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [37, 55] },
          properties: { iconCaption: '"Шелково Ривер" &amp;', description: '"Шелково Ривер"' }
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [38, 56] },
          properties: { description: '<img src=x>' }
        }
      ]
    },
    'display fixture'
  );
  const display = prepareEditorialGeometry(source);

  expect(display.features[0]?.iconCaption?.replaceAll('\u00a0', '·')).toBe('«Шелково·Ривер» &amp;');
  expect(source.features[0]?.iconCaption).toBe('"Шелково Ривер" &amp;');
  expect(display.features[0]?.description).toBe(source.features[0]?.description);
  expect(display.metadata).toBe(source.metadata);
  expect(display.features[1]).toBe(source.features[1]);
});

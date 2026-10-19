import { expect, it } from 'vitest';

import { formatParcelLabel, PARCEL_LABEL_MIN_ZOOM } from '../parcel-label';

it('formats a primary code alone unless the position is cadastral compound', () => {
  expect([
    formatParcelLabel({ code: 'SHP-A8', aliases: ['SHP-A10', 'SHP-A9'] }),
    formatParcelLabel({
      code: 'SHP-A8',
      aliases: ['SHP-A10', 'SHP-A9'],
      multipleCadastralParcels: true
    }),
    PARCEL_LABEL_MIN_ZOOM
  ]).toMatchInlineSnapshot(`
    [
      "A8",
      "A8/A9/A10",
      17,
    ]
  `);
});

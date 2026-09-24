import { expect, it } from 'vitest';

import { formatPlainText } from '../index';

const showNbsp = (value: string): string =>
  value.replaceAll('\u00a0', '·').replaceAll('\u202f', '·');

it('prepares plain text with site typography without a DOM or markup interpretation', () => {
  expect(
    [
      'Шелково Ривер п. № 1 "Ворота"',
      '<b>"Ворота"</b> <img src=x onerror=alert(1)>',
      '<code>Шелково Ривер "ворота"</code>',
      '**пруд** [Ворота](@unknown) @unknown',
      '"Ворота" & "Съезд"',
      '&amp; &lt;b&gt; &#160; &#x1f600; &unknown; &amp;lt;',
      'R&D',
      '&copy',
      '&#160',
      ''
    ].map((text) => showNbsp(formatPlainText(text)))
  ).toMatchInlineSnapshot(`
    [
      "Шелково·Ривер п.·№·1 «Ворота»",
      "<b>«Ворота»</b> <img src=x onerror=alert(1)>",
      "<code>Шелково·Ривер «ворота»</code>",
      "**пруд** [Ворота](@unknown) @unknown",
      "«Ворота» & «Съезд»",
      "&amp; &lt;b&gt; &#160; &#x1f600; &unknown; &amp;lt;",
      "R&D",
      "&copy",
      "&#160",
      "",
    ]
  `);
});

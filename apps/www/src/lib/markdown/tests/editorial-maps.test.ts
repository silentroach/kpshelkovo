import { describe, expect, it } from 'vitest';

import { extractEditorialMaps } from '../editorial-maps';

const geometry = (
  features: readonly unknown[] = [
    { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [37, 55] } }
  ],
  metadata?: unknown
): string => JSON.stringify({ type: 'FeatureCollection', metadata, features });

describe('extractEditorialMaps', () => {
  it('reads multiple fenced code nodes and their optional bare URLs', () => {
    const maps = extractEditorialMaps(
      `\`\`\`map https://example.com/scheme?view=1#start
${geometry(undefined, { name: '@unknown' })}
\`\`\`

\`\`\`json
not a map
\`\`\`

~~~map
${geometry()}
~~~`,
      'news article "2026/05/test" body'
    );

    expect(maps.map(({ index, url, geometry }) => ({ index, url, name: geometry.metadata?.name })))
      .toMatchInlineSnapshot(`
        [
          {
            "index": 1,
            "name": "@unknown",
            "url": "https://example.com/scheme?view=1#start",
          },
          {
            "index": 2,
            "name": undefined,
            "url": undefined,
          },
        ]
      `);
  });

  it.each([
    'url=https://example.com',
    '"https://example.com"',
    '[https://example.com]',
    'https://example.com/path(1)',
    'javascript:alert(1)',
    'https://user:pass@example.com/',
    'https://example.com/ one-more',
    'https://example.com\\@evil.test/'
  ])('rejects unsafe or unsupported URL meta %s', (meta) => {
    expect(() =>
      extractEditorialMaps(`\`\`\`map ${meta}\n${geometry()}\n\`\`\``, 'kb test')
    ).toThrow('kb test map insertion 1 has invalid map URL');
  });

  it('identifies the failing insertion, feature ID zero and field', () => {
    const invalid = geometry([
      {
        type: 'Feature',
        id: 0,
        geometry: { type: 'Point', coordinates: [37, 56] },
        properties: { unexpected: true }
      }
    ]);

    expect(() =>
      extractEditorialMaps(
        `\`\`\`map\n${geometry()}\n\`\`\`\n\n\`\`\`map\n${invalid}\n\`\`\``,
        'kb page "map" body'
      )
    ).toThrow(
      /kb page "map" body map insertion 2.*features\.0\.properties\.unexpected.*feature 0 \(ID 0\)/u
    );
  });

  it('reports invalid JSON in the correct map insertion', () => {
    expect(() =>
      extractEditorialMaps(
        `\`\`\`map\n${geometry()}\n\`\`\`\n\n\`\`\`map\n{\n\`\`\``,
        'news article "map" body'
      )
    ).toThrow('news article "map" body map insertion 2 has invalid JSON');
  });
});

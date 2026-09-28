import { parseMarkdownFragment } from '@shelkovo/markdown';
import { describe, expect, it } from 'vitest';

import { appendEditorialMapCaptions } from '../editorial-maps-companion';

const source = JSON.stringify({
  type: 'FeatureCollection',
  metadata: { name: '[Схема] @unknown **текст**', description: '</script> secret' },
  features: [
    {
      type: 'Feature',
      id: 0,
      properties: {
        stroke: '#123456',
        'stroke-width': '2',
        outline_expansion_meters: 2,
        precision: 'approximate'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [37, 56],
            [37.001, 56],
            [37.001, 56.001],
            [37, 56]
          ]
        ]
      }
    }
  ]
});

describe('editorial map companion AST', () => {
  it('keeps the source code node verbatim and adds exactly one plain link caption', () => {
    const body = `До схемы.\n\n\`\`\`map https://example.com/scheme\n${source}\n\`\`\`\n\nПосле схемы.`;
    const nodes = appendEditorialMapCaptions(parseMarkdownFragment(body), 'test article');
    const code = nodes.find((node) => node.type === 'code');
    const caption = nodes[nodes.indexOf(code!) + 1];

    expect(code?.type === 'code' ? [code.lang, code.meta, code.value === source] : undefined)
      .toMatchInlineSnapshot(`
        [
          "map",
          "https://example.com/scheme",
          true,
        ]
      `);
    expect(caption?.type).toBe('paragraph');
    if (caption?.type !== 'paragraph') throw new Error('missing map caption');
    expect(caption.children).toMatchInlineSnapshot(`
      [
        {
          "children": [
            {
              "type": "text",
              "value": "[Схема] @unknown **текст**",
            },
          ],
          "type": "link",
          "url": "https://example.com/scheme",
        },
      ]
    `);
    expect(nodes.filter((node) => node.type === 'code')).toHaveLength(1);
    expect(nodes.filter((node) => node.type === 'paragraph')).toHaveLength(3);
  });

  it('adds the caption inside a blockquote without duplicating adjacent text', () => {
    const nodes = appendEditorialMapCaptions(
      parseMarkdownFragment(`> Пояснение\n>\n> \`\`\`map\n> ${source}\n> \`\`\``),
      'test article'
    );
    const quote = nodes[0];

    expect(quote?.type).toBe('blockquote');
    if (quote?.type !== 'blockquote') throw new Error('missing blockquote');
    expect(quote.children.map((node) => node.type)).toMatchInlineSnapshot(`
      [
        "paragraph",
        "code",
        "paragraph",
      ]
    `);
  });

  it('normalizes only published geometry coordinates, without expanding or altering other source values', () => {
    const input = source.replaceAll('[37,56]', '[37.123456789,56.123456789]');
    const nodes = appendEditorialMapCaptions(
      parseMarkdownFragment(
        `\`\`\`map https://example.com/source?lat=55.123456789\n${input}\n\`\`\``
      ),
      'test article'
    );
    const code = nodes[0];
    if (code?.type !== 'code') throw new Error('missing map code');
    const original = JSON.parse(input);
    const published = JSON.parse(code.value);
    expect(input).toContain('[37.123456789,56.123456789]');
    expect(published.features[0].geometry.coordinates[0][0]).toEqual([37.12345679, 56.12345679]);
    expect(published.features[0].geometry.coordinates[0][1]).toEqual(
      original.features[0].geometry.coordinates[0][1]
    );
    expect({
      coordinate: published.features[0].geometry.coordinates[0][0],
      untouched: published.features[0].properties,
      metadata: published.metadata,
      url: code.meta,
      caption: nodes[1],
      original: original.features[0].geometry.coordinates[0][0]
    }).toMatchInlineSnapshot(`
      {
        "caption": {
          "children": [
            {
              "children": [
                {
                  "type": "text",
                  "value": "[Схема] @unknown **текст**",
                },
              ],
              "type": "link",
              "url": "https://example.com/source?lat=55.123456789",
            },
          ],
          "type": "paragraph",
        },
        "coordinate": [
          37.12345679,
          56.12345679,
        ],
        "metadata": {
          "description": "</script> secret",
          "name": "[Схема] @unknown **текст**",
        },
        "original": [
          37.123456789,
          56.123456789,
        ],
        "untouched": {
          "outline_expansion_meters": 2,
          "precision": "approximate",
          "stroke": "#123456",
          "stroke-width": "2",
        },
        "url": "https://example.com/source?lat=55.123456789",
      }
    `);
  });

  it.each([
    ['plain key', source],
    ['escaped key', source.replace('"coordinates":', '"co\\u006frdinates":')]
  ])('removes extra trailing zeroes from coordinate literals with %s', (_case, mapSource) => {
    const input = mapSource
      .replaceAll('[37,56]', '[37.123456790,56.123456790]')
      .replace('"id":0', '"id":0.1234567890');
    const nodes = appendEditorialMapCaptions(
      parseMarkdownFragment(`\`\`\`map\n${input}\n\`\`\``),
      'test article'
    );
    const code = nodes[0];
    if (code?.type !== 'code') throw new Error('missing map code');

    expect(code.value).not.toContain('37.123456790');
    expect(JSON.parse(code.value).features[0].geometry.coordinates[0][0]).toEqual([
      37.12345679, 56.12345679
    ]);
    expect(JSON.parse(code.value).features[0].id).toBe(0.123456789);

    const unchanged = source.replace('"id":0', '"id":0.1234567890');
    const untouched = appendEditorialMapCaptions(
      parseMarkdownFragment(`\`\`\`map\n${unchanged}\n\`\`\``),
      'test article'
    )[0];
    expect(untouched?.type === 'code' ? untouched.value : undefined).toBe(unchanged);
  });

  it('rejects a source contour that collapses in the published block', () => {
    const input = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'small',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [37, 55],
                [37.01, 55],
                [37.01, 55.0000000003],
                [37, 55]
              ]
            ]
          }
        }
      ]
    });

    expect(() =>
      appendEditorialMapCaptions(
        parseMarkdownFragment(`\`\`\`map\n${input}\n\`\`\``),
        'news/map.md'
      )
    ).toThrow(/news\/map\.md map insertion 1.*after coordinate rounding.*coordinates/u);
  });
});

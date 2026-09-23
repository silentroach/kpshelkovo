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
});

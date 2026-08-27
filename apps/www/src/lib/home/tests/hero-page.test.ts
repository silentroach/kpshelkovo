/// <reference types="astro/client" />

import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import HomePage from '@/pages/index.astro';

const getImageTag = (html: string, attribute?: string): string => {
  const attributePattern = attribute ? `(?=[^>]*\\b${attribute}\\b)` : '';
  const tag = html.match(
    new RegExp(`<img\\b${attributePattern}[^>]*>`, 'u'),
  )?.[0];
  if (!tag)
    throw new Error(`Expected image${attribute ? ` with ${attribute}` : ''}`);

  return tag;
};

const getResourceAttributes = (tag: string): readonly string[] =>
  [...tag.matchAll(/\s(src|srcset)="[^"]+"/gu)].map((match) => match[1] ?? '');

describe('home hero markup', () => {
  it('leaves resource discovery to runtime while retaining a no-JS fallback', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(HomePage);
    const hero = html.match(
      /<section\b(?=[^>]*\bdata-home-hero-mode=)[\s\S]*?<\/section>/u,
    )?.[0];
    if (!hero) throw new Error('Expected home hero section');

    const activeImage = getImageTag(hero, 'data-home-hero-image');
    const fallbackMarkup = hero.match(/<noscript>([\s\S]*?)<\/noscript>/u)?.[1];
    if (!fallbackMarkup) throw new Error('Expected no-JS hero fallback');
    const fallbackImage = getImageTag(
      fallbackMarkup,
      'data-home-hero-fallback',
    );

    expect({
      activeHidden: /\shidden(?:[\s=>])/u.test(activeImage),
      activePriority: /\sfetchpriority="high"/u.test(activeImage),
      activeResourceAttributes: getResourceAttributes(activeImage),
      fallbackAlt: /\salt="Панорама поселка Шелково"/u.test(fallbackImage),
      fallbackDimensions: [
        fallbackImage.match(/\swidth="([^"]+)"/u)?.[1],
        fallbackImage.match(/\sheight="([^"]+)"/u)?.[1],
      ],
      fallbackLoading: fallbackImage.match(/\sloading="([^"]+)"/u)?.[1],
      fallbackPriority: /\sfetchpriority="high"/u.test(fallbackImage),
      fallbackResourceAttributes: getResourceAttributes(fallbackImage),
      fallbackSizes: fallbackImage.match(/\ssizes="([^"]+)"/u)?.[1],
      runtimeSources: [
        ...activeImage.matchAll(/\sdata-(day|night)-(src|srcset)="([^"]+)"/gu),
      ].map((match) => `${match[1]}-${match[2]}`),
    }).toMatchInlineSnapshot(`
      {
        "activeHidden": true,
        "activePriority": true,
        "activeResourceAttributes": [],
        "fallbackAlt": true,
        "fallbackDimensions": [
          "2172",
          "724",
        ],
        "fallbackLoading": "eager",
        "fallbackPriority": true,
        "fallbackResourceAttributes": [
          "src",
          "srcset",
        ],
        "fallbackSizes": "100vw",
        "runtimeSources": [
          "day-src",
          "day-srcset",
          "night-src",
          "night-srcset",
        ],
      }
    `);
  });
});

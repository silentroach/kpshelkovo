/// <reference types="astro/client" />

import { readFileSync } from 'node:fs';

import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { parse } from 'yaml';

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import Page from '@/pages/815/compare/settlements/[slug]/index.astro';
import { createAstroContainer } from '@/test/astro-container';

import { mapRawSettlement } from '../settlement/mapper';
import { RawSettlementSchema } from '../settlement/schema';

const baseline = mapRawSettlement(
  RawSettlementSchema.parse(
    parse(
      readFileSync(
        new URL('../../../data/compare/settlements/shelkovo.yaml', import.meta.url),
        'utf8'
      )
    )
  )
);

test.each([
  { slug: baseline.slug, mapUrl: 'https://yandex.ru/maps/org/123/?from=source', color: '#064b08' },
  { slug: 'external', mapUrl: 'https://example.com/location/plan', color: '#6a502e' },
  { slug: 'other', mapUrl: undefined, color: '#6a502e' }
])(
  'renders the $slug preview and independent server map links',
  async ({ slug, mapUrl, color }) => {
    const settlement = {
      ...baseline,
      slug,
      location: { ...baseline.location, lat: 55, lng: 37, mapUrl }
    };
    const container = await createAstroContainer();
    const html = await container.renderToString(Page, {
      props: { settlement, baseline, distanceFromMkad: 60 },
      request: new Request(`https://kpshelkovo.online/815/compare/settlements/${slug}/`)
    });
    const window = new Window();
    try {
      window.document.write(html);
      const preview = window.document.querySelector('map-preview');
      expect(JSON.parse(preview?.getAttribute('data-preview') ?? '{}')).toMatchInlineSnapshot(`
        {
          "anchor": [
            0.8,
            0.5,
          ],
          "coordinates": {
            "lat": 55,
            "lng": 37,
          },
          "distributionPosition": "bottom right",
          "muted": true,
          "mutedOpacity": 0.4,
          "zoom": 12,
        }
      `);
      const template = preview?.querySelector('template');
      const marker = template?.content.querySelector('a');
      expect(template?.content.childElementCount).toBe(1);
      expect(marker?.querySelector('span')?.getAttribute('style')).toBe(`background: ${color}`);
      expect(marker?.getAttribute('href')).toBe(
        mapUrl ?? 'https://yandex.ru/maps/?pt=37,55&z=15&l=map'
      );
      expect({
        rootLink: template?.content.firstElementChild === marker,
        hidden: marker?.hasAttribute('aria-hidden'),
        tabIndex: marker?.tabIndex,
        target: marker?.getAttribute('target'),
        rel: marker?.getAttribute('rel'),
        draggable: marker?.getAttribute('draggable'),
        named: marker?.getAttribute('aria-label')?.includes(settlement.name),
        titled: marker?.getAttribute('title')?.includes(settlement.name)
      }).toMatchInlineSnapshot(`
        {
          "draggable": "false",
          "hidden": false,
          "named": true,
          "rel": "noopener noreferrer",
          "rootLink": true,
          "tabIndex": 0,
          "target": "_blank",
          "titled": true,
        }
      `);
      const mapLinks = window.document.querySelectorAll(
        'a[aria-label="Открыть поселок на Яндекс.Картах"]'
      );
      expect(mapLinks).toHaveLength(2);
      for (const link of mapLinks) {
        expect(link.getAttribute('href')).toBe(
          mapUrl ?? 'https://yandex.ru/maps/?pt=37,55&z=15&l=map'
        );
      }
      expect(preview?.querySelector('[data-fallback]')).toBeNull();
      expect(window.document.querySelector('[data-testid="settlement-map"]')).toBeNull();
    } finally {
      await window.happyDOM.close();
    }
  }
);

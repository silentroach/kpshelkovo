/// <reference types="astro/client" />

import { readFileSync } from 'node:fs';

import { formatText } from '@shelkovo/typography';
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
      const heading = window.document.querySelector('h1');
      expect(window.document.querySelectorAll('h1')).toHaveLength(1);
      expect(heading?.textContent).toBe(formatText(settlement.name));
      expect(heading?.querySelector('a')).toBeNull();
      expect(window.document.querySelector('.page-heading-subtitle')?.textContent.trim()).toBe(
        settlement.location.district
      );
      const searchBody = window.document.querySelector('p.ui-visually-hidden[data-pagefind-body]');
      expect(searchBody?.textContent.trim()).toBeTruthy();
      expect(searchBody?.closest('.page-heading')).toBeNull();
      for (const suffix of ['desktop', 'mobile']) {
        const id = `${slug}-tariff-tip-${suffix}`;
        if (window.document.getElementById(id)) {
          expect(window.document.querySelector(`[aria-describedby="${id}"]`)).toBeTruthy();
        }
      }
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
          "zoom": 12,
        }
      `);
      const template = preview?.querySelector('template');
      const marker = template?.content.querySelector('div');
      expect(template?.content.childElementCount).toBe(1);
      expect(marker?.getAttribute('style')).toBe(`background: ${color}`);
      expect({
        hidden: marker?.getAttribute('aria-hidden'),
        links: template?.content.querySelectorAll('a').length,
        tabIndex: marker?.tabIndex
      }).toMatchInlineSnapshot(`
        {
          "hidden": "true",
          "links": 0,
          "tabIndex": -1,
        }
      `);
      const mapLinks = window.document.querySelectorAll(
        'a[aria-label="Открыть поселок на Яндекс.Картах"]'
      );
      expect(mapLinks).toHaveLength(1);
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

test('keeps the heading and available actions without a map preview or optional links', async () => {
  const settlement = {
    ...baseline,
    website: '',
    telegram: undefined,
    location: { ...baseline.location, lat: Number.NaN, mapUrl: 'https://example.com/map' }
  };
  const container = await createAstroContainer();
  const html = await container.renderToString(Page, {
    props: { settlement, baseline, distanceFromMkad: 60 },
    request: new Request('https://kpshelkovo.online/815/compare/settlements/shelkovo/')
  });
  const window = new Window();
  try {
    window.document.write(html);
    const { document } = window;
    expect({
      heading: document.querySelector('h1')?.textContent.replaceAll('\u00a0', '·'),
      preview: !!document.querySelector('map-preview'),
      actions: Array.from(document.querySelectorAll('.page-heading-actions a'), (link) => ({
        name: link.getAttribute('aria-label'),
        href: link.getAttribute('href')
      }))
    }).toMatchInlineSnapshot(`
      {
        "actions": [
          {
            "href": "https://example.com/map",
            "name": "Открыть поселок на Яндекс.Картах",
          },
        ],
        "heading": "КП·Шелково",
        "preview": false,
      }
    `);
  } finally {
    await window.happyDOM.close();
  }
});

test.each([
  {
    mapUrl: undefined,
    expectedUrl: 'https://yandex.ru/maps/?pt=38.98765432,55.12345679&z=15&l=map'
  },
  {
    mapUrl: 'https://example.com/map?pt=38.987654321987,55.123456789123',
    expectedUrl: 'https://example.com/map?pt=38.987654321987,55.123456789123'
  }
])(
  'limits coordinates in the preview and JSON-LD, preserving map URL $mapUrl',
  async ({ mapUrl, expectedUrl }) => {
    const location = { ...baseline.location, lat: 55.123456789123, lng: 38.987654321987, mapUrl };
    const settlement = { ...baseline, location };
    const container = await createAstroContainer();
    const html = await container.renderToString(Page, {
      props: { settlement, baseline, distanceFromMkad: 60 },
      request: new Request('https://kpshelkovo.online/815/compare/settlements/shelkovo/')
    });
    const window = new Window();
    try {
      window.document.write(html);
      const preview = window.document.querySelector('map-preview');
      const place = Array.from(
        window.document.querySelectorAll('script[type="application/ld+json"]')
      )
        .map(
          (script) => JSON.parse(script.textContent ?? '{}') as { '@type'?: string; geo?: unknown }
        )
        .find((schema) => schema['@type'] === 'Place');

      expect({
        preview: JSON.parse(preview?.getAttribute('data-preview') ?? '{}'),
        geo: place?.geo,
        links: Array.from(
          window.document.querySelectorAll('a[aria-label="Открыть поселок на Яндекс.Картах"]'),
          (link) => link.getAttribute('href')
        )
      }).toMatchObject({
        preview: { coordinates: { lat: 55.12345679, lng: 38.98765432 } },
        geo: { latitude: 55.12345679, longitude: 38.98765432 },
        links: [expectedUrl]
      });
      expect(location).toEqual({
        ...baseline.location,
        lat: 55.123456789123,
        lng: 38.987654321987,
        mapUrl
      });
    } finally {
      await window.happyDOM.close();
    }
  }
);

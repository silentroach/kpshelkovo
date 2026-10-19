import { parseMarkdownFragment } from '@shelkovo/markdown';
import { Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';

import { EditorialMapDataSchema } from '@/lib/geometry/editorial-map-data-schema';
import { createEditorialMapSelectionResolver } from '@/lib/geometry/editorial-map-selection';
import { RawEditorialGeometrySchema } from '@/lib/geometry/editorial-schema';

import type { EditorialMapSelectionResolver } from '../editorial-maps.types';
import { renderMarkdown } from '../render';

const geometry = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [38, 56] as const },
      iconCaption: 'A1'
    }
  ]
};
const resolver: EditorialMapSelectionResolver = () => ({ geometry, parcelLabels: [] });
const body = '```map\n{"sets":["prepared"]}\n```';

describe('editorial map integration', () => {
  it('injects the prepared resolver into real HTML rendering', () => {
    const document = new Window().document;
    document.body.innerHTML = renderMarkdown(body, {
      editorialMaps: true,
      editorialMapSource: 'news/example',
      editorialMapResolver: resolver
    });

    expect(
      EditorialMapDataSchema.parse(
        JSON.parse(document.querySelector('editorial-map')?.getAttribute('data-geometry') ?? '{}')
      )
    ).toMatchObject({
      type: 'FeatureCollection',
      features: [{ iconCaption: 'A1' }]
    });
  });

  it('passes the prepared resolver through news and KB companion builders', async () => {
    Object.assign(import.meta.env, { SITE: 'https://example.com', BASE_URL: '/' });
    const [{ buildNewsArticleMarkdown }, { buildKbPageMarkdown }] = await Promise.all([
      import('@/lib/news/markdown'),
      import('@/lib/kb/markdown')
    ]);
    const article = {
      id: '2026/05/example',
      title: 'News',
      author: { id: 'ig', name: 'Редакция', kind: 'editorial' as const },
      year: 2026,
      month: 5,
      day: 1,
      entry: 'example',
      url: '/news/example/',
      markdownUrl: '/news/example/index.md',
      canonical: 'https://example.com/news/example/',
      publishedAt: new Date('2026-05-01T00:00:00Z'),
      publishedIso: '2026-05-01',
      appliesToAllAreas: true,
      areas: [],
      tags: [],
      pinned: false,
      photos: [],
      attachments: [],
      events: [],
      summary: 'Summary',
      body,
      mentions: []
    };
    const page = {
      title: 'KB',
      flags: [],
      robots: undefined,
      url: '/kb/example/',
      canonical: 'https://example.com/kb/example/',
      routeSlug: 'example',
      isSection: false,
      body,
      mentions: []
    };
    for (const output of [
      buildNewsArticleMarkdown(article, resolver),
      buildKbPageMarkdown(page, resolver)
    ]) {
      const code = parseMarkdownFragment(output).find(
        (node) => node.type === 'code' && node.lang === 'map'
      );
      if (code?.type !== 'code') throw new Error('Map missing from companion');
      const result = RawEditorialGeometrySchema.parse(JSON.parse(code.value));
      expect(result.features[0]?.geometry.coordinates).toEqual([38, 56]);
      expect(result.features).toHaveLength(1);
    }
    const missing = createEditorialMapSelectionResolver({ parcels: [], places: [], sets: [] });
    expect(() => buildNewsArticleMarkdown(article, missing)).toThrow(
      `news article "${article.id}" body map insertion 1`
    );
    expect(() => buildKbPageMarkdown(page, missing)).toThrow(`${page.canonical} map insertion 1`);
    expect(() =>
      renderMarkdown(body, {
        editorialMaps: true,
        editorialMapSource: 'news/example',
        editorialMapResolver: missing
      })
    ).toThrow('news/example map insertion 1');
  });

  it('loads only for reference maps and reuses the prepared resolver', async () => {
    const load = vi.fn(async () => resolver);
    vi.doMock('@/lib/geometry/editorial-map-selection-load', () => ({
      loadEditorialMapSelectionResolver: load
    }));
    try {
      const prepare = await import('../editorial-map-resolver-load');
      expect(
        await prepare.loadEditorialMapResolverForMarkdown('plain text', 'legacy')
      ).toBeUndefined();
      expect(
        await prepare.loadEditorialMapResolverForMarkdown(
          '```map\n{"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[38,56]}}]}\n```',
          'legacy'
        )
      ).toBeUndefined();
      const first = await prepare.loadEditorialMapResolverForMarkdown(body, 'news/article');
      const second = await prepare.loadEditorialMapResolverForMarkdown(body, 'kb/page');
      expect(first).toBe(resolver);
      expect(second).toBe(resolver);
      expect(load).toHaveBeenCalledTimes(2);
    } finally {
      vi.doUnmock('@/lib/geometry/editorial-map-selection-load');
    }
  });
});

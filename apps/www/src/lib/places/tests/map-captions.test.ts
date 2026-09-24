import svelteRenderer from '@astrojs/svelte/server.js';
import { parseMarkdownFragment } from '@shelkovo/markdown';
import { Window } from 'happy-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { z } from 'zod';

import PlaceMap from '@/components/places/PlaceMap.svelte';
// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import PlacePreview from '@/components/places/PlacePreview.astro';
import { parseEditorialGeometry } from '@/lib/geometry/editorial-mapper';
import { appendEditorialMapCaptions } from '@/lib/markdown/editorial-maps-companion';
import { renderMarkdown } from '@/lib/markdown/render';
// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import MapPage from '@/pages/map/index.astro';
import { createAstroContainer } from '@/test/astro-container';

import { loadPlaces } from '../load';
import { buildPlaceMapPublicPayload } from '../map-public';
import { testPlace } from './place.test-helper';

vi.mock('../load', () => ({ loadPlaces: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

it('delivers the same prepared caption to all three maps while preserving public sources', async () => {
  const caption = 'В "Шелково Ривер"  у ворот № 1 <b>вход</b> **текст** @unknown &nbsp;';
  const description = '<script>hidden</script> "без типографики"';
  const source = JSON.stringify({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [38, 55] },
        properties: { iconCaption: caption, description }
      }
    ]
  });
  const place = testPlace({
    showOnMap: true,
    geometry: parseEditorialGeometry(JSON.parse(source), 'fixture'),
    body: 'Private body sentinel'
  });
  vi.mocked(loadPlaces).mockResolvedValue([place, testPlace({ slug: 'hidden', showOnMap: false })]);
  const renderSvelte = vi.spyOn(svelteRenderer, 'renderToStaticMarkup');
  const container = await createAstroContainer();
  const window = new Window();
  try {
    await container.renderToString(MapPage);
    const props = renderSvelte.mock.calls.find(([component]) => component === PlaceMap)?.[1];
    const mapPlaces = z
      .object({ places: z.array(z.record(z.string(), z.unknown())) })
      .parse(props).places;
    expect(mapPlaces).toHaveLength(1);
    expect(Object.keys(mapPlaces[0]!).sort()).toMatchInlineSnapshot(`
      [
        "coordinates",
        "geometry",
        "marker",
        "name",
        "openingHours",
        "slug",
        "status",
        "url",
      ]
    `);

    const body = `\`\`\`map\n${source}\n\`\`\``;
    window.document.body.innerHTML =
      renderMarkdown(body, { editorialMaps: true }) +
      (await container.renderToString(PlacePreview, { props: { place } }));
    const markdownGeometry = JSON.parse(
      window.document.querySelector('editorial-map')!.getAttribute('data-geometry')!
    );
    const preview = z
      .object({ geometry: z.unknown() })
      .parse(
        JSON.parse(window.document.querySelector('map-preview')!.getAttribute('data-preview')!)
      );
    expect(preview.geometry).toEqual(markdownGeometry);
    expect(JSON.parse(JSON.stringify(mapPlaces[0]?.geometry))).toEqual(markdownGeometry);
    const prepared = z
      .object({ features: z.array(z.object({ iconCaption: z.string(), description: z.string() })) })
      .parse(markdownGeometry).features[0]!;
    expect(
      prepared.iconCaption.replaceAll('\u00a0', '·').replaceAll('\u202f', '·')
    ).toMatchInlineSnapshot(
      `"В·«Шелково·Ривер» у·ворот·№·1 <b>вход</b> **текст** @unknown &nbsp;"`
    );
    expect(prepared.description).toBe(description);
    expect(
      window.document.querySelector('editorial-map :is(b, script), map-preview :is(b, script)')
    ).toBeFalsy();

    expect(place.geometry?.features[0]?.iconCaption).toBe(caption);
    expect(
      buildPlaceMapPublicPayload([place]).places[0]?.geometry?.features[0]?.properties.iconCaption
    ).toBe(caption);
    const code = appendEditorialMapCaptions(parseMarkdownFragment(body), 'fixture').find(
      (node) => node.type === 'code'
    );
    expect(code?.value).toBe(source);
  } finally {
    await window.happyDOM.close();
  }
});

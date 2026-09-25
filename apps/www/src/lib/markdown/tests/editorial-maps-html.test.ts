import { Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';

import { EditorialMapDataSchema } from '@/lib/geometry/editorial-map-data-schema';
import * as editorialMapper from '@/lib/geometry/editorial-mapper';
import { createPersonMentionTarget } from '@/lib/people/mentions';

import { renderMarkdown } from '../render';

const map = (name?: string, url?: string, iconCaption = '<img src=x onerror=alert(1)>'): string => {
  const geojson = JSON.stringify({
    type: 'FeatureCollection',
    metadata: { name, description: '<script>hidden</script>', creator: '@unknown' },
    features: [
      {
        type: 'Feature',
        id: 0,
        geometry: { type: 'Point', coordinates: [37, 56] },
        properties: {
          iconCaption,
          iconContent: '7',
          description: '</script><script>alert(1)</script>'
        }
      }
    ]
  });
  return `\`\`\`map${url ? ` ${url}` : ''}\n${geojson}\n\`\`\``;
};

const document = (markdown: string, options?: Parameters<typeof renderMarkdown>[1]) => {
  const page = new Window().document;
  page.body.innerHTML = renderMarkdown(markdown, { editorialMaps: true, ...options });
  return page;
};

describe('editorial map HTML', () => {
  it('serializes visible text verbatim without changing hidden descriptions or running markup', () => {
    const page = document(map(undefined, undefined, '"Шелково Ривер" &amp; <img src=x>'));
    const host = page.querySelector('editorial-map');
    const geometry = JSON.parse(host?.getAttribute('data-geometry') ?? '');

    expect(geometry.features[0].iconCaption).toBe('"Шелково Ривер" &amp; <img src=x>');
    expect(geometry.features[0].description).toBe('</script><script>alert(1)</script>');
    expect(page.querySelector('img, script')).toBeFalsy();
  });
  it.each([undefined, { editorialMaps: false }])(
    'keeps valid and malformed map fences as code unless explicitly enabled: %j',
    (options) => {
      const page = new Window().document;
      page.body.innerHTML = renderMarkdown(`${map()}\n\n\`\`\`map\nnot JSON\n\`\`\``, options);

      expect(page.querySelectorAll('editorial-map')).toHaveLength(0);
      expect(page.querySelectorAll('pre code')).toHaveLength(2);
      expect(page.querySelectorAll('pre code')[1]?.textContent).toBe('not JSON\n');
    }
  );

  it.each([
    ['Схема объезда', 'https://example.com/map', 'Схема объезда', 'https://example.com/map'],
    ['Схема объезда', undefined, 'Схема объезда', undefined],
    [undefined, 'https://example.com/map', 'Открыть карту', 'https://example.com/map'],
    [undefined, undefined, undefined, undefined]
  ])('renders the name/URL combination %s / %s', (name, url, caption, href) => {
    const page = document(map(name, url));
    const figure = page.querySelector('figure.ui-editorial-map');
    const host = figure?.querySelector('editorial-map');
    const figcaption = figure?.querySelector('figcaption');

    expect(host?.getAttribute('data-pagefind-ignore')).toBe('all');
    expect(
      EditorialMapDataSchema.parse(JSON.parse(host?.getAttribute('data-geometry') ?? ''))
    ).toMatchObject({
      type: 'FeatureCollection',
      features: [{ id: 0, iconCaption: '<img src=x onerror=alert(1)>', iconContent: '7' }]
    });
    expect(figcaption?.textContent?.replace('#', '').trim()).toBe(caption);
    expect(figcaption?.querySelector('a:not(.ui-heading-anchor)')?.getAttribute('href')).toBe(href);
    expect(figcaption?.closest('[data-pagefind-ignore]')).toBeFalsy();
    expect(page.querySelector('script, img')).toBeFalsy();
    expect(page.body.textContent).not.toContain('hidden');
    expect(page.body.textContent).not.toContain('alert(1)');
  });

  it('keeps data script-safe and treats the map name as text, not HTML/Markdown/mention', () => {
    const name = '<svg onload=alert(1)> **@unknown**';
    const html = renderMarkdown(map(name), {
      editorialMaps: true,
      mentions: { context: 'test article', registry: new Map() }
    });
    const page = new Window().document;
    page.body.innerHTML = html;

    expect(html).not.toContain('</script><script>');
    expect(html).toContain('\\u003c/script\\u003e');
    expect(page.querySelector('svg, script')).toBeFalsy();
    expect(page.querySelector('figcaption h3')?.textContent).toContain(name);
    expect(page.querySelector('figcaption strong')).toBeFalsy();
  });

  it('keeps the authored TOC, reference links, neighboring mentions and other code in one document', () => {
    const registry = new Map([
      ['kschemelinin', createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин')]
    ]);
    const page = document(
      `[TOC]\n\n## Начало\n\nО схеме сообщил @kschemelinin.\n\n${map('Схема')}\n\n[Пояснение][ref]\n\n[ref]: https://example.com/guide\n\n\`\`\`diff\n@unknown [TOC]\n\`\`\`\n\n\`\`\`unknown\n@unknown\n\`\`\``,
      { mentions: { context: 'test article', registry } }
    );

    expect(page.querySelector('.ui-markdown-toc__list')?.textContent).toContain('Начало');
    expect(page.querySelector('.ui-markdown-toc__list')?.textContent).not.toContain('Схема');
    expect(page.querySelector('a[href="https://example.com/guide"]')?.textContent).toBe(
      'Пояснение'
    );
    expect(page.querySelector('a[href="/people/kschemelinin/"]')?.textContent).toBe(
      'Кирилл Щемелинин'
    );
    expect(page.querySelectorAll('pre code')).toHaveLength(2);
    expect(page.querySelectorAll('editorial-map')).toHaveLength(1);
  });

  it('allocates unique IDs around authored headings, repeated maps and template IDs', () => {
    const page = document(
      `[TOC]\n\n## editorial map 1\n\n${map('Повтор')}\n\n${map('Повтор')}\n\n## Повтор`,
      { reservedIds: ['editorial-map-1', 'editorial-map-2'] }
    );
    const ids = [...page.querySelectorAll('[id]')].map((element) => element.id);
    const mapHeadings = [...page.querySelectorAll('figcaption h3')];

    expect(ids).toHaveLength(new Set(ids).size);
    expect(mapHeadings.map((element) => element.id)).toMatchInlineSnapshot(`
      [
        "editorial-map-1-3",
        "editorial-map-2-2",
      ]
    `);
    expect(page.querySelectorAll('.ui-markdown-toc__list a')).toHaveLength(2);
    expect(page.querySelector('.ui-markdown-toc__list a[href="#editorial-map-1-2"]')).toBeTruthy();
  });

  it('replaces map code nested in a blockquote without changing its neighbors', () => {
    const page = document(
      `> Пояснение\n>\n> ${map('Карта').replaceAll('\n', '\n> ')}\n\n${map('Вторая карта')}`
    );

    expect(page.querySelectorAll('blockquote editorial-map')).toHaveLength(1);
    expect(page.querySelectorAll('editorial-map')).toHaveLength(2);
    expect(page.querySelector('blockquote')?.textContent).toContain('Пояснение');
  });

  it('distinguishes text-only material from material with multiple rendered map hosts', () => {
    expect(renderMarkdown('Только текст.', { editorialMaps: true })).not.toContain(
      '<editorial-map'
    );
    expect(
      renderMarkdown(`${map()}\n\n${map()}`, { editorialMaps: true }).match(/<editorial-map\b/gu)
    ).toHaveLength(2);
  });

  it('rejects malformed map code at render time with a source and insertion number', () => {
    expect(() =>
      renderMarkdown(`${map()}\n\n\`\`\`map\n{\n\`\`\``, {
        editorialMaps: true,
        mentions: { context: 'test article', registry: new Map() }
      })
    ).toThrow('test article map insertion 2 has invalid JSON');
  });

  it('rejects invalid prepared data before writing HTML with the source, insertion, field and ID zero', () => {
    const parse = editorialMapper.parseEditorialGeometry;
    const spy = vi
      .spyOn(editorialMapper, 'parseEditorialGeometry')
      .mockImplementation((input, source) => {
        const collection = parse(input, source);
        return source.endsWith('insertion 2')
          ? {
              ...collection,
              features: [{ ...collection.features[0]!, iconContent: 'invalid' }]
            }
          : collection;
      });
    try {
      expect(() =>
        renderMarkdown(`${map()}\n\n${map()}`, {
          editorialMaps: true,
          mentions: { context: 'test article', registry: new Map() }
        })
      ).toThrow(/test article map insertion 2.*features\.0\.iconContent.*feature 0 \(ID 0\)/);
    } finally {
      spy.mockRestore();
    }
  });
});

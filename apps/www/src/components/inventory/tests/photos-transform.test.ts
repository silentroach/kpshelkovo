/// <reference types="astro/client" />
import { Window } from 'happy-dom';
import { expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import InventoryPhotos from '../InventoryPhotos.astro';
// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import InventoryPreview from '../InventoryPreview.astro';

it('keeps the leading photo eager and preserves its original, alternative and caption', async () => {
  const container = await createAstroContainer();
  const window = new Window();
  const url = 'https://media.kpshelkovo.online/ukogo/tool/kit.jpeg';
  try {
    window.document.write(
      await container.renderToString(InventoryPhotos, {
        props: {
          leading: true,
          photos: [{ url, width: 1200, height: 800, alt: 'Комплект', caption: 'Фото владельца' }]
        }
      })
    );
    const image = window.document.querySelector('img');
    expect({
      count: window.document.querySelectorAll('figure').length,
      loading: image?.getAttribute('loading'),
      alt: image?.getAttribute('alt'),
      original: window.document.querySelector('figure a')?.getAttribute('href'),
      caption: window.document.querySelector('figcaption')?.textContent?.trim(),
      excludedFromSearch: window.document
        .querySelector('.inventory-photos')
        ?.getAttribute('data-pagefind-ignore')
    }).toMatchInlineSnapshot(`
      {
        "alt": "Комплект",
        "caption": "Фото владельца",
        "count": 1,
        "excludedFromSearch": "all",
        "loading": "eager",
        "original": "https://media.kpshelkovo.online/ukogo/tool/kit.jpeg",
      }
    `);
  } finally {
    await window.happyDOM.close();
  }
});

it.each([
  'ukogo/tool/kit.jpeg',
  'news/2026/10/work/kit.jpeg',
  'reviews/2026/10/review/kit.jpeg',
  'people/neighbor.jpeg',
  'kb/tools/2026-10-20/kit.jpeg'
])('generates different adaptive resources for the supported source %s', async (path) => {
  const url = `https://media.kpshelkovo.online/${path}`;
  const container = await createAstroContainer();
  const window = new Window();
  try {
    window.document.write(
      await container.renderToString(InventoryPhotos, {
        props: { photos: [{ url, width: 1200, height: 800, alt: 'Комплект' }] }
      })
    );
    const image = window.document.querySelector('img');
    const sources =
      image
        ?.getAttribute('srcset')
        ?.split(', ')
        .map((source) => source.split(' ')[0]) ?? [];
    expect(image?.getAttribute('src')).not.toBe(url);
    expect(sources.length).toBeGreaterThan(1);
    expect(sources).not.toContain(url);
    expect(new Set(sources).size).toBe(sources.length);
    expect(window.document.querySelector('figure a')?.getAttribute('href')).toBe(url);
  } finally {
    await window.happyDOM.close();
  }
});

it('generates distinct small preview resources linked to the offer instead of the web-master', async () => {
  const container = await createAstroContainer();
  const window = new Window();
  try {
    window.document.write(
      await container.renderToString(InventoryPreview, {
        props: {
          href: '/ukogo/construction/drill/test/',
          photo: {
            url: 'https://media.kpshelkovo.online/ukogo/test/kit.jpeg',
            width: 1200,
            height: 800,
            alt: 'Комплект'
          }
        }
      })
    );
    const image = window.document.querySelector('img');
    const sources =
      image
        ?.getAttribute('srcset')
        ?.split(', ')
        .map((source) => source.split(' ')[0]) ?? [];
    expect(sources.length).toBeGreaterThan(1);
    expect(new Set(sources).size).toBe(sources.length);
    expect(window.document.querySelector('a')?.getAttribute('href')).toBe(
      '/ukogo/construction/drill/test/'
    );
  } finally {
    await window.happyDOM.close();
  }
});

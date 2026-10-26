import { formatText } from '@shelkovo/typography';
/// <reference types="astro/client" />
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import InventoryOffer from '@/components/inventory/InventoryOffer.astro';
// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import InventoryPhotos from '@/components/inventory/InventoryPhotos.astro';
import { visibleWhitespace } from '@/lib/test/visible-whitespace';
import { createAstroContainer } from '@/test/astro-container';

import { inventoryPageFixture } from './fixtures/inventory-page';

describe('inventory photos', () => {
  it('links just the first photo to detail and omits the preview when there are no photos', async () => {
    const container = await createAstroContainer();
    const document = new Window().document;
    const offers = inventoryPageFixture().byKind.get('drill')?.offers ?? [];
    for (const offer of offers) {
      const fragment = document.createElement('div');
      fragment.innerHTML = await container.renderToString(InventoryOffer, { props: { offer } });
      document.body.append(fragment);
      const image = fragment.querySelector('img');
      expect(fragment.querySelectorAll('img')).toHaveLength(offer.photos.length ? 1 : 0);
      expect(fragment.querySelector('figure, figcaption')).toBeFalsy();
      if (offer.photos.length) {
        expect(image?.closest('a')?.getAttribute('href')).toBe(offer.url);
        expect(image?.getAttribute('alt')).toBe(formatText(offer.photos[0]?.alt ?? ''));
      } else {
        expect(fragment.querySelector('.inventory-preview')).toBeFalsy();
      }
    }
  });
  it('keeps multiple photos and plaintext captions with their respective offers', async () => {
    const container = await createAstroContainer();
    const document = new Window().document;
    for (const offer of inventoryPageFixture().kinds.find((kind) => kind.id === 'drill')?.offers ??
      []) {
      const fragment = document.createElement('div');
      fragment.innerHTML = `<article id="${offer.anchorId}">${await container.renderToString(InventoryPhotos, { props: { photos: offer.photos } })}</article>`;
      document.body.append(fragment);
    }
    expect(
      [...document.querySelectorAll('article')].map((offer) => ({
        id: offer.id,
        photos: [...offer.querySelectorAll('figure')].map((figure) => ({
          href: figure.querySelector('a')?.getAttribute('href'),
          alt: visibleWhitespace(figure.querySelector('img')?.getAttribute('alt')),
          caption: visibleWhitespace(figure.querySelector('figcaption')?.textContent),
          lazy: figure.querySelector('img')?.getAttribute('loading'),
          width: figure.querySelector('img')?.getAttribute('width'),
          height: figure.querySelector('img')?.getAttribute('height'),
          widths: [
            ...(figure
              .querySelector('img')
              ?.getAttribute('srcset')
              ?.matchAll(/\s(\d+)w/gu) ?? [])
          ].map((match) => Number(match[1]))
        }))
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "id": "offer-free",
          "photos": [],
        },
        {
          "id": "offer-negotiable",
          "photos": [
            {
              "alt": "Дрель без·кейса",
              "caption": "Отдельная дрель, без·кейса.",
              "height": "1280",
              "href": "https://media.kpshelkovo.online/ukogo/negotiable/drill.jpeg",
              "lazy": "lazy",
              "width": "960",
              "widths": [
                480,
                768,
                960,
              ],
            },
          ],
        },
        {
          "id": "offer-paid",
          "photos": [
            {
              "alt": "Дрель с·кейсом",
              "caption": "Кейс и·сверла.",
              "height": "1067",
              "href": "https://media.kpshelkovo.online/ukogo/paid/kit.jpeg",
              "lazy": "lazy",
              "width": "1600",
              "widths": [
                480,
                768,
                960,
                1280,
                1600,
              ],
            },
            {
              "alt": "Шильдик дрели",
              "caption": undefined,
              "height": "480",
              "href": "https://media.kpshelkovo.online/ukogo/paid/label.jpeg",
              "lazy": "lazy",
              "width": "320",
              "widths": [
                320,
              ],
            },
          ],
        },
      ]
    `);
    const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(document.querySelector('figure')?.closest('[data-pagefind-ignore="all"]')).toBeTruthy();
  });

  it('omits empty galleries and treats caption markup as ordinary text', async () => {
    const container = await createAstroContainer();
    expect(
      await container.renderToString(InventoryPhotos, { props: { photos: [] } })
    ).not.toContain('<figure');
    const document = new Window().document;
    document.write(
      await container.renderToString(InventoryPhotos, {
        props: {
          photos: [
            {
              url: 'https://media.kpshelkovo.online/ukogo/test/photo.jpeg',
              width: 100,
              height: 200,
              alt: 'Фото',
              caption: '<em>Комплект</em> [ссылка](/kb/test/)'
            }
          ]
        }
      })
    );
    expect(document.querySelector('figcaption')?.textContent).toBe(
      '<em>Комплект</em> [ссылка](/kb/test/)'
    );
    expect(document.querySelector('figcaption em, figcaption a')).toBeFalsy();
  });
});

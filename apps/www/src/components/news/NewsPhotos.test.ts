/// <reference types="astro/client" />

import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';
import { visibleWhitespace } from '@/lib/test/visible-whitespace';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import NewsPhotos from './NewsPhotos.astro';

const getSrcsetWidths = (imageHtml?: string): readonly number[] =>
  [...(imageHtml?.matchAll(/\s(\d+)w(?:,|")/gu) ?? [])].map((match) =>
    Number(match[1]),
  );

describe('NewsPhotos', () => {
  it('renders photo captions through markdown and typograf', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(NewsPhotos, {
      props: {
        photos: [
          {
            url: 'https://media.kpshelkovo.online/news/2026/08/water-test/protocol.jpeg',
            width: 960,
            height: 1280,
            alt: 'Протокол проверки воды',
            caption: 'Ошибка описана [в Шелково Парк](/news/correction/).',
          },
        ],
      },
    });
    const caption = html.match(/<figcaption[\s\S]*?<\/figcaption>/u)?.[0];

    expect(visibleWhitespace(caption)).toContain(
      '<p>Ошибка описана <a href="/news/correction/">в·Шелково·Парк</a>.</p>',
    );
  });

  it('offers a 2x full-width variant without upscaling smaller photos', async () => {
    const container = await createAstroContainer();
    const fullWidthPhoto = {
      url: 'https://media.kpshelkovo.online/news/2026/08/retina-test/original.jpeg',
      width: 2560,
      height: 1920,
      alt: 'Полноширинная фотография',
    };
    const smallPhoto = {
      url: 'https://media.kpshelkovo.online/news/2026/08/retina-test/small.jpeg',
      width: 960,
      height: 1280,
      alt: 'Небольшая фотография',
    };
    const html = await container.renderToString(NewsPhotos, {
      props: {
        photos: [fullWidthPhoto, smallPhoto, smallPhoto],
      },
    });
    const linkedImages = [...html.matchAll(/<a[\s\S]*?<\/a>/gu)].map(
      (match) => match[0],
    );
    const fullWidthImage = linkedImages[0];
    const smallImage = linkedImages[1];

    expect({
      fullWidthHref: fullWidthImage?.match(/\shref="([^"]+)"/u)?.[1],
      fullWidthIntrinsicWidth: fullWidthImage?.match(/\swidth="(\d+)"/u)?.[1],
      fullWidthSizes: fullWidthImage?.match(/\ssizes="([^"]+)"/u)?.[1],
      fullWidthSrcsetWidths: getSrcsetWidths(fullWidthImage),
      smallIntrinsicWidth: smallImage?.match(/\swidth="(\d+)"/u)?.[1],
      smallSrcsetWidths: getSrcsetWidths(smallImage),
    }).toMatchInlineSnapshot(`
      {
        "fullWidthHref": "https://media.kpshelkovo.online/news/2026/08/retina-test/original.jpeg",
        "fullWidthIntrinsicWidth": "2560",
        "fullWidthSizes": "(min-width: 1180px) 1132px, calc(100vw - 2.5rem)",
        "fullWidthSrcsetWidths": [
          480,
          768,
          960,
          1280,
          1600,
          2264,
          2560,
        ],
        "smallIntrinsicWidth": "960",
        "smallSrcsetWidths": [
          480,
          768,
          960,
        ],
      }
    `);
  });
});

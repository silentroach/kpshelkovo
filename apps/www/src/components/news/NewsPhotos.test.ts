/// <reference types="astro/client" />

import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';
import { visibleWhitespace } from '@/lib/test/visible-whitespace';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import NewsPhotos from './NewsPhotos.astro';

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
});

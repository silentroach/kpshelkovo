import { Window } from 'happy-dom';
import { expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro components are resolved by Astro/Vitest at test time.
import MapPreview from '../MapPreview.astro';

it.each([undefined, 'https://yandex.ru/maps/?original'])(
  'renders the marker template and optional no-JS fallback (%s)',
  async (mapUrl) => {
    const container = await createAstroContainer();
    const html = await container.renderToString(MapPreview, {
      props: {
        preview: { coordinates: { lng: 37, lat: 55 } },
        label: 'Местоположение',
        class: 'adapter-preview',
        'data-astro-cid-adapter': true,
        mapUrl
      },
      slots: { default: '<span data-marker></span>' }
    });
    const window = new Window();
    try {
      window.document.body.innerHTML = html;
      const element = window.document.querySelector('map-preview');
      const fallback = element?.querySelector('[data-fallback]');
      expect(
        element?.querySelector('template')?.content.querySelector('[data-marker]')
      ).toBeTruthy();
      expect(element?.querySelector('[data-marker]')).toBeFalsy();
      expect(element?.querySelector('[data-canvas]')?.hasAttribute('inert')).toBe(!!mapUrl);
      expect(fallback?.querySelector('a')?.getAttribute('href')).toBe(mapUrl);
      expect(!!fallback).toBe(!!mapUrl);
      expect(fallback?.closest('[hidden], [aria-hidden="true"], template')).toBeFalsy();
      expect(element?.getAttribute('aria-label')).toBe('Местоположение');
      expect(element?.classList.contains('adapter-preview')).toBe(true);
      expect(element?.hasAttribute('data-astro-cid-adapter')).toBe(true);
    } finally {
      await window.happyDOM.close();
    }
  }
);

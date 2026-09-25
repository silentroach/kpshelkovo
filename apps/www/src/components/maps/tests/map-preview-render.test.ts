import { Window } from 'happy-dom';
import { expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro components are resolved by Astro/Vitest at test time.
import MapPreview from '../MapPreview.astro';

it('renders the marker template and error without a no-JS map action', async () => {
  const container = await createAstroContainer();
  const html = await container.renderToString(MapPreview, {
    props: {
      preview: { coordinates: { lng: 37, lat: 55 } },
      label: 'Местоположение',
      class: 'adapter-preview',
      'data-astro-cid-adapter': true
    },
    slots: { default: '<span data-marker></span>' }
  });
  const window = new Window();
  try {
    window.document.body.innerHTML = html;
    const element = window.document.querySelector('map-preview');
    expect(element?.querySelector('template')?.content.querySelector('[data-marker]')).toBeTruthy();
    expect(element?.querySelector('[data-marker]')).toBeFalsy();
    expect(element?.querySelector('[data-canvas]')?.hasAttribute('inert')).toBe(false);
    expect(element?.querySelector('[data-fallback], a[href^="https://yandex.ru/"]')).toBeFalsy();
    expect(element?.querySelector('[data-message]')?.hasAttribute('hidden')).toBe(true);
    expect(element?.querySelector('[data-message]')?.closest('[data-fallback]')).toBeFalsy();
    expect(element?.getAttribute('aria-label')).toBe('Местоположение');
    expect(element?.classList.contains('adapter-preview')).toBe(true);
    expect(element?.hasAttribute('data-astro-cid-adapter')).toBe(true);
  } finally {
    await window.happyDOM.close();
  }
});

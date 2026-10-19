// @vitest-environment happy-dom
import type { YMap } from '@yandex/ymaps3-types';
import { afterEach, expect, it, vi } from 'vitest';

import type { EditorialParcelLabel } from '@/lib/geometry/editorial-map-labels.types';

import { createEditorialParcelLabels } from '../editorial-parcel-labels';

afterEach(() => vi.unstubAllGlobals());

it('adds noninteractive label markers only at the shared zoom threshold and clears them', () => {
  const map = { addChild: vi.fn(), removeChild: vi.fn() } as Partial<YMap> as YMap;
  const markers: Array<{ readonly element: HTMLElement }> = [];
  class Marker {
    constructor(_options: unknown, element: HTMLElement) {
      markers.push({ element });
    }
  }
  vi.stubGlobal('ymaps3', { YMapMarker: Marker });
  const sdk = window.ymaps3;
  if (!sdk) throw new Error('Map SDK missing');
  const labels: readonly EditorialParcelLabel[] = [{ text: 'A8/A9', coordinates: [37, 55] }];
  const layer = createEditorialParcelLabels(sdk, map, labels);

  layer.update(16.99);
  expect(map.addChild).not.toHaveBeenCalled();
  layer.update(17);
  expect(map.addChild).toHaveBeenCalledOnce();
  expect(markers[0]?.element.tagName).toBe('SPAN');
  expect(markers[0]?.element.textContent).toBe('A8/A9');
  expect(markers[0]?.element.hasAttribute('tabindex')).toBe(false);
  layer.update(18);
  expect(map.addChild).toHaveBeenCalledOnce();
  layer.update(16);
  expect(map.removeChild).toHaveBeenCalledOnce();
  layer.update(17);
  layer.destroy();
  expect(map.removeChild).toHaveBeenCalledTimes(2);
});

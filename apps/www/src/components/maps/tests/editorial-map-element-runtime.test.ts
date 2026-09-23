// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  document.body.replaceChildren();
  document.querySelectorAll('[data-yandex-maps-api="true"]').forEach((script) => script.remove());
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('connects two eager custom elements through one real runtime script request', async () => {
  vi.stubEnv('PUBLIC_YANDEX_MAPS_API_KEY', 'test-key');
  const maps: Array<{ readonly canvas: HTMLElement; readonly destroy: ReturnType<typeof vi.fn> }> =
    [];
  let requests = 0;
  vi.spyOn(document.head, 'appendChild').mockImplementation((script) => {
    requests += 1;
    queueMicrotask(() => {
      vi.stubGlobal('ymaps3', {
        ready: Promise.resolve(),
        YMap: class {
          addChild = vi.fn();
          update = vi.fn();
          destroy = vi.fn();
          setBehaviors = vi.fn();
          constructor(canvas: HTMLElement) {
            maps.push({ canvas, destroy: this.destroy });
          }
        },
        YMapDefaultSchemeLayer: class {},
        YMapDefaultFeaturesLayer: class {},
        YMapMarker: class {},
        YMapFeature: class {},
        YMapListener: class {},
        YMapControls: class {},
        import: async () => ({ YMapOpenMapsButton: class {} })
      });
      script.dispatchEvent(new Event('load'));
    });
    return script;
  });
  // Import after setting the key: runtime captures it when the module first loads.
  await import('../editorial-map-element');
  const data = JSON.stringify({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [37, 55] } }]
  });
  const first = document.createElement('editorial-map');
  const second = document.createElement('editorial-map');
  first.setAttribute('data-geometry', data);
  second.setAttribute('data-geometry', data);
  document.body.append(first, second);
  await vi.waitFor(() => expect(maps).toHaveLength(2));
  expect(requests).toBe(1);
  expect(maps[0]?.canvas).not.toBe(maps[1]?.canvas);
  first.remove();
  expect(maps[0]?.destroy).toHaveBeenCalledOnce();
  expect(maps[1]?.destroy).not.toHaveBeenCalled();
});

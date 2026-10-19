import { expect, it, vi } from 'vitest';

const loads = vi.hoisted(() => ({
  parcels: vi.fn(async () => ({ parcels: [] })),
  places: vi.fn(async () => ({ places: [] })),
  sets: vi.fn(async () => [])
}));
vi.mock('@/lib/parcels/load', () => ({ loadParcelsData: loads.parcels }));
vi.mock('@/lib/places/load', () => ({ loadPlacesData: loads.places }));
vi.mock('@/lib/map-selection-sets/load', () => ({ loadMapSelectionSets: loads.sets }));

import { loadEditorialMapSelectionResolver } from '../editorial-map-selection-load';

it('shares preparation between concurrent HTML and companion requests', async () => {
  const [htmlResolver, companionResolver] = await Promise.all([
    loadEditorialMapSelectionResolver(),
    loadEditorialMapSelectionResolver()
  ]);
  expect(htmlResolver).toBe(companionResolver);
  expect(await loadEditorialMapSelectionResolver()).toBe(htmlResolver);
  expect(
    Object.fromEntries(Object.entries(loads).map(([key, load]) => [key, load.mock.calls.length]))
  ).toMatchInlineSnapshot(`
      {
        "parcels": 1,
        "places": 1,
        "sets": 1,
      }
    `);
});

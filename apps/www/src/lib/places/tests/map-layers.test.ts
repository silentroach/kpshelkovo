import { describe, expect, it } from 'vitest';

import { isPlaceLayerVisible } from '../map-layers';
import type { PlaceMapLayer } from '../schema';

describe('place layer visibility', () => {
  it.each([
    { enabled: [], visible: [true, false, false] },
    { enabled: ['infra'], visible: [true, true, false] },
    { enabled: ['club'], visible: [true, false, true] },
    { enabled: ['infra', 'club'], visible: [true, true, true] }
  ] satisfies readonly {
    readonly enabled: readonly PlaceMapLayer[];
    readonly visible: readonly boolean[];
  }[])('keeps layers independent for $enabled', ({ enabled, visible }) => {
    expect(
      ([undefined, 'infra', 'club'] as const).map((mapLayer) =>
        isPlaceLayerVisible({ mapLayer }, enabled)
      )
    ).toEqual(visible);
  });
});

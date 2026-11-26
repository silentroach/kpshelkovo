import { describe, expect, it } from 'vitest';

import { readAsphaltAreas } from '../asphalt-areas';
import { createRoadSurfaceSplitter } from '../road-surfaces';
import type { RoadSurfaceFragment } from '../road-surfaces-types';

// About 3.4 m in latitude.
const asphaltEnd = 55 + 1 / 32768;
const areas = `
# The asphalt area around the junction.
- - [-1, 54]
  - [1, 54]
  - [1, ${asphaltEnd}]
  - [-1, ${asphaltEnd}]
  - [-1, 54]
`;

describe('readAsphaltAreas', () => {
  it.each([
    ['an open ring', '- [[0, 0], [1, 0], [1, 1], [0, 1]]'],
    ['a self-crossing ring', '- [[0, 0], [1, 1], [0, 1], [1, 0], [0, 0]]'],
    ['a ring that doubles back', '- [[0, 0], [2, 0], [1, 0], [1, 1], [0, 0]]'],
    ['a ring that touches itself', '- [[0, 0], [2, 0], [2, 2], [1, 0], [0, 2], [0, 0]]'],
    ['latitude out of range', '- [[0, 0], [1, 91], [1, 1], [0, 0]]'],
    ['a mapping rather than a sequence', 'areas: []']
  ])('rejects %s', (_, yaml) => {
    expect(() => readAsphaltAreas(yaml)).toThrow();
  });
});

describe('createRoadSurfaceSplitter', () => {
  it('marks even a short paved start on a side road without rounding its endpoint', () => {
    const split = createRoadSurfaceSplitter(areas);

    expect(
      split([
        [0, 55],
        [0, 55.005]
      ])
        .map(({ surface, line }) => `${surface}: ${line.join(' → ')}`)
        .join('\n')
    ).toMatchInlineSnapshot(`
      "asphalt: 0,55 → 0,55.000030517578125
      gravel: 0,55.000030517578125 → 0,55.005"
    `);
  });

  it('keeps the same coverage when the geometry is subdivided into two ways', () => {
    const split = createRoadSurfaceSplitter(areas);
    const a = [0, 55] as const;
    const b = [0, 55.001] as const;
    const c = [0, 55.005] as const;
    const road = split([a, c]);
    const subdivided = split([a, b, c]);

    const segments = (fragments: readonly RoadSurfaceFragment[]) =>
      fragments.flatMap(({ line, surface }) =>
        line.slice(1).map((end, i) => [surface, line[i], end])
      );
    expect(segments(subdivided)).toEqual(segments(split([a, b]).concat(split([b, c]))));
    expect(subdivided.map(({ line, surface }) => [surface, line[0], line.at(-1)])).toEqual(
      road.map(({ line, surface }) => [surface, line[0], line.at(-1)])
    );
  });

  it('classifies all roads as gravel when the list of areas is empty', () => {
    const split = createRoadSurfaceSplitter('[]');
    const line = [
      [0, 55],
      [0, 56]
    ] as const;

    expect(split(line)).toEqual([{ surface: 'gravel', line }]);
  });
});

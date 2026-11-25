import { describe, expect, it } from 'vitest';

import { createRoadClipper } from '../clip-to-boundary';

// U-shaped area: the gap (1 < x < 3 above y=1) is outside.
const clip = createRoadClipper([
  [
    [0, 0],
    [4, 0],
    [4, 4],
    [3, 4],
    [3, 1],
    [1, 1],
    [1, 4],
    [0, 4],
    [0, 0]
  ]
]);

describe('road display boundary', () => {
  it('leaves the excluded interior of a closed ring empty', () => {
    const courtyard = createRoadClipper([
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
        [0, 0]
      ],
      [
        [1, 1],
        [1, 3],
        [3, 3],
        [3, 1],
        [1, 1]
      ]
    ]);
    expect(
      courtyard([
        [0, 2],
        [4, 2]
      ])
    ).toEqual([
      [
        [0, 2],
        [1, 2]
      ],
      [
        [3, 2],
        [4, 2]
      ]
    ]);
  });

  it('retains two distinct crossings even when all source nodes are outside', () => {
    expect(
      clip([
        [-1, 2],
        [5, 2]
      ])
    ).toEqual([
      [
        [0, 2],
        [1, 2]
      ],
      [
        [3, 2],
        [4, 2]
      ]
    ]);
  });

  it('keeps original internal vertices and only the overlapping part of a boundary edge', () => {
    expect(
      clip([
        [-1, 0],
        [2, 0],
        [2, 0],
        [5, 0]
      ])
    ).toEqual([
      [
        [0, 0],
        [2, 0],
        [4, 0]
      ]
    ]);
    expect(
      clip([
        [-1, 1],
        [0, 0],
        [1, -1]
      ])
    ).toEqual([]);
  });

  it('does not join two visits to the same boundary point through an external detour', () => {
    expect(
      clip([
        [0.5, 2],
        [1, 2],
        [2, 2],
        [1, 2],
        [0.5, 3]
      ])
    ).toEqual([
      [
        [0.5, 2],
        [1, 2]
      ],
      [
        [1, 2],
        [0.5, 3]
      ]
    ]);
  });
});

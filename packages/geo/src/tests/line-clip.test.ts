import { describe, expect, it } from 'vitest';

import { createLineClipper, createLineSplitter } from '../index.ts';
import type { LineFragment, PolygonCoordinates } from '../types.ts';

// U-shaped area: the gap (1 < x < 3 above y=1) is outside.
const clip = createLineClipper([
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

describe('createLineClipper', () => {
  it('leaves the excluded interior of a closed ring empty', () => {
    const courtyard = createLineClipper([
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

const square = (left: number, right: number): PolygonCoordinates => [
  [
    [left, 0],
    [right, 0],
    [right, 2],
    [left, 2],
    [left, 0]
  ]
];

const describeFragments = (fragments: readonly LineFragment[]): string =>
  fragments
    .map(({ inside, line }) => `${inside ? 'inside' : 'outside'}: ${line.join(' → ')}`)
    .join('\n');

describe('createLineSplitter', () => {
  it('cuts between source nodes and shares the coordinate with the adjacent fragment', () => {
    const split = createLineSplitter([square(0, 4)]);
    const fragments = split([
      [-1, 1],
      [1, 1],
      [2, 1]
    ]);

    expect(describeFragments(fragments)).toMatchInlineSnapshot(`
      "outside: -1,1 → 0,1
      inside: 0,1 → 1,1 → 2,1"
    `);
    expect(fragments[0]?.line.at(-1)).toBe(fragments[1]?.line[0]);
  });

  it('keeps the union continuous through overlap without adding redundant cut points', () => {
    const split = createLineSplitter([square(0, 4), square(2, 6)]);

    expect(
      describeFragments(
        split([
          [-1, 1],
          [7, 1]
        ])
      )
    ).toMatchInlineSnapshot(`
      "outside: -1,1 → 0,1
      inside: 0,1 → 6,1
      outside: 6,1 → 7,1"
    `);
  });

  it('classifies along an edge but ignores a single touch between source nodes', () => {
    const split = createLineSplitter([
      square(0, 4),
      [
        [
          [5, 0],
          [6, 1],
          [7, 1],
          [5, 0]
        ]
      ]
    ]);

    expect(
      describeFragments(
        split([
          [6, 0],
          [-2, 0]
        ])
      )
    ).toMatchInlineSnapshot(`
      "outside: 6,0 → 4,0
      inside: 4,0 → 0,0
      outside: 0,0 → -2,0"
    `);
  });

  it('keeps source vertices on a line that only touches a corner', () => {
    const split = createLineSplitter([square(0, 4)]);
    const line = [
      [-1, 1],
      [0, 0],
      [1, -1]
    ] as const;

    expect(split(line)).toEqual([{ inside: false, line }]);
  });
});

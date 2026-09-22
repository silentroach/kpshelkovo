import { describe, expect, it } from 'vitest';

import { createDisplayOffset } from '../display-offset';

describe('parcel display offset', () => {
  it('leaves zero offset untouched and moves east/north by ground metres from original coordinates', () => {
    const original: [number, number] = [37.715, 55.06];
    expect(createDisplayOffset(0, 0, 55.06)(original)).toEqual(original);

    const shift = createDisplayOffset(5.2, 3.3, 55.06);
    const moved = shift(original);
    const westAndSouth = createDisplayOffset(-5.2, -3.3, 55.06)(original);
    expect(moved[0]).toBeGreaterThan(original[0]);
    expect(moved[1]).toBeGreaterThan(original[1]);
    expect(westAndSouth[0]).toBeLessThan(original[0]);
    expect(westAndSouth[1]).toBeLessThan(original[1]);
    expect(
      (((moved[0] - original[0]) * Math.PI) / 180) * 6378137 * Math.cos((55.06 * Math.PI) / 180)
    ).toBeCloseTo(5.2, 3);
    expect((((moved[1] - original[1]) * Math.PI) / 180) * 6378137).toBeCloseTo(3.3, 2);
    expect(shift(original)).toEqual(moved);
    expect(original).toEqual([37.715, 55.06]);
  });
});

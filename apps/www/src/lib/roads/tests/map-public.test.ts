import { describe, expect, it } from 'vitest';

import { buildRoadMapPayload } from '../map-public';
import { mapOverpassRoads } from '../mapper';

describe('road display geometry', () => {
  it('uses one display shift without changing source coordinates or splitting shared nodes', () => {
    const timestamp = '2026-11-25T00:00:00Z';
    const snapshot = mapOverpassRoads(
      {
        osm3s: { timestamp_osm_base: timestamp },
        elements: [
          { type: 'node', id: 1, lon: 37.73123456789, lat: 55.06 },
          { type: 'node', id: 2, lon: 37.74, lat: 55.06 },
          { type: 'node', id: 3, lon: 37.74, lat: 55.07 },
          { type: 'way', id: 10, nodes: [1, 2], tags: { highway: 'residential' } },
          { type: 'way', id: 11, nodes: [2, 3], tags: { highway: 'service' } }
        ]
      },
      [55.048, 37.701, 55.077, 37.758],
      timestamp
    );
    const original = JSON.stringify(snapshot);
    const noShift = buildRoadMapPayload(snapshot, { offset_east_m: 0, offset_north_m: 0 });
    const config = { offset_east_m: 5, offset_north_m: 3 };
    const shifted = buildRoadMapPayload(snapshot, config);
    expect(noShift.lines[0]?.[0]).toEqual([37.73123457, 55.06]);
    expect(shifted.lines[0]?.[1]).toBeDefined();
    expect(shifted.lines[0]?.[1]).toEqual(shifted.lines[1]?.[0]);
    expect(shifted.lines[0]?.[0]).toMatchInlineSnapshot(`
      [
        37.731313,
        55.06002695,
      ]
    `);
    expect(buildRoadMapPayload(snapshot, config)).toEqual(shifted);
    expect(JSON.stringify(snapshot)).toBe(original);
  });
});

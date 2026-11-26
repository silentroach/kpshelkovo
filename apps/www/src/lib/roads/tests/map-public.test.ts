import { describe, expect, it } from 'vitest';

import { parseLocalRoads } from '../local-mapper';
import { buildRoadMapPayload } from '../map-public';
import { mapOverpassRoads } from '../mapper';
import { buildRoadNetwork } from '../road-network';

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
    const boundary = [
      [
        [37.72, 55.05],
        [37.75, 55.05],
        [37.75, 55.08],
        [37.72, 55.08],
        [37.72, 55.05]
      ]
    ] as const;
    const original = JSON.stringify(snapshot);
    const network = buildRoadNetwork(snapshot, []);
    const noShift = buildRoadMapPayload(network, boundary, '[]', {
      offset_east_m: 0,
      offset_north_m: 0
    });
    const config = { offset_east_m: 5, offset_north_m: 3 };
    const shifted = buildRoadMapPayload(network, boundary, '[]', config);
    expect(noShift.gravel[0]?.[0]).toEqual([37.73123457, 55.06]);
    expect(shifted.gravel[0]?.[1]).toBeDefined();
    expect(shifted.gravel[0]?.[1]).toEqual(shifted.gravel[1]?.[0]);
    expect(shifted.gravel[0]?.[0]).toMatchInlineSnapshot(`
      [
        37.731313,
        55.06002695,
      ]
    `);
    expect(buildRoadMapPayload(network, boundary, '[]', config)).toEqual(shifted);
    expect(JSON.stringify(snapshot)).toBe(original);
  });

  it('cuts a local line by the territory and applies coverage before shifting the map', () => {
    const date = '2026-11-25T00:00:00Z';
    const snapshot = mapOverpassRoads(
      {
        osm3s: { timestamp_osm_base: date },
        elements: [
          { type: 'node', id: 1, lon: 37.729, lat: 55.06 },
          { type: 'node', id: 2, lon: 37.731, lat: 55.06 },
          { type: 'way', id: 1, nodes: [1, 2], tags: { highway: 'service' } }
        ]
      },
      [55.048, 37.701, 55.077, 37.758],
      date
    );
    const network = buildRoadNetwork(
      snapshot,
      parseLocalRoads('[{ id: local, points: [{ osm_node: 2 }, [37.735, 55.06]] }]')
    );
    const boundary = [
      [
        [37.73, 55.05],
        [37.734, 55.05],
        [37.734, 55.07],
        [37.73, 55.07],
        [37.73, 55.05]
      ]
    ] as const;
    const areas =
      '[[[37.732, 55.05], [37.736, 55.05], [37.736, 55.07], [37.732, 55.07], [37.732, 55.05]]]';
    const payload = buildRoadMapPayload(network, boundary, areas, {
      offset_east_m: 10,
      offset_north_m: 0
    });
    expect(payload.asphalt).toHaveLength(1);
    expect(payload.gravel).toHaveLength(2);
    expect(payload.asphalt[0]?.[0]).toEqual(payload.gravel[1]?.[1]);
    expect(payload.asphalt[0]?.[1]?.[0]).toBeCloseTo(37.73415686, 8);
    expect(network.ways[1]?.nodes).toHaveLength(2);
  });
});

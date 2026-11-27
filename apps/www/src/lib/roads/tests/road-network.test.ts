import { ok } from 'node:assert/strict';

import { expect, it } from 'vitest';

import { parseLocalRoads } from '../local-mapper.ts';
import { mapOverpassRoads } from '../mapper.ts';
import { buildRoadNetwork } from '../road-network.ts';

it('connects the two streets by OSM IDs without joining a coincident bend to another street', () => {
  const snapshot = mapOverpassRoads(
    {
      osm3s: { timestamp_osm_base: '2026-11-25T00:00:00Z' },
      elements: [
        { type: 'node', id: 1, lon: 37.72, lat: 55.06 },
        { type: 'node', id: 2, lon: 37.73, lat: 55.06 },
        { type: 'node', id: 3, lon: 37.73, lat: 55.07 },
        { type: 'node', id: 4, lon: 37.74, lat: 55.07 },
        { type: 'node', id: 5, lon: 37.74, lat: 55.065 },
        { type: 'node', id: 6, lon: 37.75, lat: 55.065 },
        { type: 'way', id: 11, nodes: [1, 2], tags: { highway: 'residential' } },
        { type: 'way', id: 12, nodes: [3, 4], tags: { highway: 'residential' } },
        { type: 'way', id: 13, nodes: [5, 6], tags: { highway: 'service' } }
      ]
    },
    [55.048, 37.701, 55.077, 37.758],
    '2026-11-25T00:00:00Z'
  );
  const original = structuredClone(snapshot);
  const localRoads = parseLocalRoads(`
    - id: connector
      points:
        - osm_node: 2
        - [37.74, 55.065]
        - osm_node: 3
  `);
  const network = buildRoadNetwork(snapshot, localRoads);

  const start = network.ways.find((way) => way.source === 'osm' && way.id === 11)?.nodes[1];
  const end = network.ways.find((way) => way.source === 'osm' && way.id === 12)?.nodes[0];
  const coincident = network.ways.find((way) => way.source === 'osm' && way.id === 13)?.nodes[0];
  const connector = network.ways.find((way) => way.source === 'local' && way.id === 'connector');
  const bend = connector?.nodes[1];
  ok(start && end && bend && coincident);

  expect(connector?.nodes).toEqual([start, bend, end]);
  expect(connector?.nodes).not.toContain(coincident);
  expect(network.nodes.get(bend)?.position).toEqual([37.74, 55.065]);
  expect(network.nodes.get(bend)?.position).toEqual(network.nodes.get(coincident)?.position);
  expect(snapshot).toStrictEqual(original);

  const moved = buildRoadNetwork(
    {
      ...snapshot,
      nodes: snapshot.nodes.map((node) => (node.id === 2 ? { ...node, lat: 55.061 } : node))
    },
    localRoads
  );
  expect(moved.nodes.get(start)?.position).toEqual([37.73, 55.061]);
});

it('rejects duplicate local road keys so their private nodes cannot overlap', () => {
  expect(() =>
    parseLocalRoads(`
      - id: connector
        points: [[37.73, 55.06], [37.74, 55.07]]
      - id: connector
        points: [[37.75, 55.06], [37.74, 55.07]]
    `)
  ).toThrow('Duplicate local road ID: connector');
});

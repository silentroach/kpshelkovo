import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { updateRoadSnapshot } from '../../../../scripts/roads/update.ts';
import { compareRoadSnapshots } from '../compare.ts';
import { mapOverpassRoads } from '../mapper.ts';

const timestamp = '2026-11-25T00:00:00Z';
const nodes = [
  { type: 'node', id: 1, lat: 55.06, lon: 37.73 },
  { type: 'node', id: 2, lat: 55.06, lon: 37.74, tags: { barrier: 'lift_gate' } },
  { type: 'node', id: 3, lat: 55.07, lon: 37.74 },
  { type: 'node', id: 4, lat: 55.06, lon: 37.74 }
];
const ways = [
  { type: 'way', id: 11, nodes: [1, 2], tags: { highway: 'residential' } },
  { type: 'way', id: 12, nodes: [3, 2], tags: { highway: 'service', access: 'private' } },
  { type: 'way', id: 13, nodes: [4, 1], tags: { highway: 'service', surface: 'gravel' } },
  { type: 'way', id: 14, nodes: [1, 3], tags: { highway: 'steps' } },
  { type: 'way', id: 16, nodes: [4, 3], tags: { highway: 'track', motorcar: 'yes' } }
];
const response = (elements: readonly unknown[]) => ({
  osm3s: { timestamp_osm_base: timestamp },
  elements
});
const snapshot = (elements: readonly unknown[]) =>
  mapOverpassRoads(response(elements), [55.048, 37.701, 55.077, 37.758], timestamp);

describe('road snapshot updates', () => {
  it('keeps unnamed and unpaved streets and junctions, but excludes tracks and steps', () => {
    const result = snapshot([...ways.toReversed(), ...nodes.toReversed()]);
    expect(result.ways.map(({ id, nodes }) => `${id}: ${nodes.join(',')}`).join('\n'))
      .toMatchInlineSnapshot(`
        "11: 1,2
        12: 3,2
        13: 4,1"
      `);
    expect(result.nodes.find(({ id }) => id === 2)?.tags?.barrier).toBe('lift_gate');
  });

  it('reports moved nodes, changed links at identical coordinates, additions and removals', () => {
    const before = snapshot([...ways, ...nodes]);
    const after = snapshot([
      ways[0],
      ways[1],
      { type: 'way', id: 15, nodes: [1, 3], tags: { highway: 'service' } },
      nodes[0],
      { ...nodes[1], lat: 55.061 },
      nodes[2],
      nodes[3]
    ]);
    expect(compareRoadSnapshots(after, before)).toMatchInlineSnapshot(`
      {
        "added": [
          15,
        ],
        "changed": [
          11,
          12,
        ],
        "removed": [
          13,
        ],
      }
    `);
    const reconnected = snapshot([{ ...ways[0], nodes: [1, 4] }, ...ways.slice(1), ...nodes]);
    expect(compareRoadSnapshots(reconnected, before).changed).toEqual([11]);
    expect(compareRoadSnapshots(before, snapshot([...nodes, ...ways].toReversed())))
      .toMatchInlineSnapshot(`
        {
          "added": [],
          "changed": [],
          "removed": [],
        }
      `);
  });

  it('preserves the accepted file on failed downloads and does not rewrite an identical input', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'shelkovo-roads-'));
    const output = {
      accepted: join(directory, 'accepted.json'),
      candidate: join(directory, 'candidate.json')
    };
    try {
      await updateRoadSnapshot(output, undefined, async () =>
        Response.json(response([...nodes, ...ways]))
      );
      await expect(readFile(output.accepted)).rejects.toHaveProperty('code', 'ENOENT');
      await updateRoadSnapshot(output, output.candidate, async () => {
        throw new Error('unexpected network');
      });
      const original = await readFile(output.accepted, 'utf8');
      const originalFile = await stat(output.accepted);
      await expect(
        updateRoadSnapshot(output, undefined, async () => {
          throw new Error('offline');
        })
      ).rejects.toThrow('offline');
      await expect(
        updateRoadSnapshot(output, undefined, async () =>
          Response.json({
            ...response([...nodes, ...ways]),
            remark: 'runtime error: timeout'
          })
        )
      ).rejects.toThrow('runtime error: timeout');
      await expect(
        updateRoadSnapshot(output, undefined, async () =>
          Response.json(response([...nodes.slice(1), ...ways]))
        )
      ).rejects.toThrow('OSM way 11 references missing node 1');
      await updateRoadSnapshot(output, output.candidate);
      expect(await readFile(output.accepted, 'utf8')).toBe(original);
      expect((await stat(output.accepted)).ino).toBe(originalFile.ino);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

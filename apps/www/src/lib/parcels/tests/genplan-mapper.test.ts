import { describe, expect, it } from 'vitest';

import { mapGenplanSnapshot, sortParcelFeatures } from '../genplan-mapper';
import { GenplanSnapshotSchema } from '../source-schemas';

const snapshot = (plot: Record<string, unknown>, capturedAt = '2026-09-22T22:45:00Z') =>
  GenplanSnapshotSchema.parse({
    part: 'shr',
    page: 'https://dgtime.ru/shr/shr-genplan/',
    capturedAt,
    plots: [{ id: 'L43', status: 'Свободен', location: 'луговой', ...plot }]
  });

describe('genplan mapping', () => {
  it.each([
    ['Свободен', 'available'],
    ['Забронирован', 'reserved'],
    ['Продан', 'sold'],
    ['Снят с продажи', 'unavailable'],
    ['Без документов', 'unavailable'],
    ['Неразобранное', 'unavailable'],
    ['Закрыто и не реализовано', 'unavailable']
  ])('%s maps to %s', (source, target) => {
    expect(mapGenplanSnapshot(snapshot({ status: `  ${source}  ` })).plots[0]?.status).toBe(target);
  });

  it.each([
    ['луговой', ['meadow']],
    ['деревья на участке', ['trees']],
    ['с лесными деревьями', ['trees']],
    ['лесной участок', ['forest_plot']],
    ['примыкает к лесу', ['forest_border']],
    ['с видом на лес', ['forest_view']],
    ['с выходом в лес', ['forest_access']],
    ['с выходом к реке', ['river_access']],
    ['с видом на лес у реки', ['forest_view', 'near_river']],
    ['с выходом в лес и к реке', ['forest_access', 'river_access']],
    ['у леса и реки', ['near_river', 'near_forest']],
    ['с пляжем', ['beach']],
    ['с прудом', ['pond']],
    ['рядом с парком', ['near_park']],
    ['в лесном парке', ['forest_park']]
  ])('%s maps exactly to %j', (source, features) => {
    expect(mapGenplanSnapshot(snapshot({ location: `  ${source}  ` })).plots[0]?.features).toEqual(
      features
    );
  });

  it('rejects new wording even when it contains familiar words', () => {
    expect(
      GenplanSnapshotSchema.safeParse({
        ...snapshot({}),
        plots: [{ id: 'L43', status: 'Свободен', location: 'с видом на лес рядом с прудом' }]
      }).success
    ).toBe(false);
    expect(
      GenplanSnapshotSchema.safeParse({
        ...snapshot({}),
        plots: [{ id: 'L43', status: 'Предпродажа', location: 'луговой' }]
      }).success
    ).toBe(false);
    expect(
      GenplanSnapshotSchema.safeParse({
        ...snapshot({}),
        plots: [{ id: 'L43', status: 'Свободен' }]
      }).success
    ).toBe(false);
  });

  it('retains the source designation while canonicalizing only documented Cyrillic letters', () => {
    const mapped = mapGenplanSnapshot(snapshot({ id: 'АК43', objectprice: 4_500_000 }));
    expect(mapped.plots[0]).toMatchInlineSnapshot(`
      {
        "cadastralReference": undefined,
        "code": "SHR-AK43",
        "features": [
          "meadow",
        ],
        "priceRub": 4500000,
        "sourceId": "АК43",
        "status": "available",
      }
    `);
    expect(() => mapGenplanSnapshot(snapshot({ id: 'Я43' }))).toThrow(
      'unsupported plot designation'
    );
    expect(() => mapGenplanSnapshot(snapshot({ id: 'а43' }))).toThrow(
      'unsupported plot designation'
    );
    expect(() => mapGenplanSnapshot(snapshot({ id: ' АК43 ' }))).toThrow(
      'unsupported plot designation'
    );
    expect(() =>
      mapGenplanSnapshot(
        GenplanSnapshotSchema.parse({
          ...snapshot({}),
          plots: [
            { id: 'AK43', status: 'Свободен', location: 'луговой' },
            { id: 'АК43', status: 'Свободен', location: 'луговой' }
          ]
        })
      )
    ).toThrow('duplicate canonical plot code');
  });

  it('preserves full rubles, leaves zero or missing prices absent, and rejects other formats', () => {
    expect(mapGenplanSnapshot(snapshot({ objectprice: 4_500_000 })).plots[0]?.priceRub).toBe(
      4_500_000
    );
    expect(mapGenplanSnapshot(snapshot({ objectprice: 0 })).plots[0]?.priceRub).toBeUndefined();
    expect(mapGenplanSnapshot(snapshot({})).plots[0]?.priceRub).toBeUndefined();
    for (const value of [-1, 1.5, '4 500 000', '4.5 млн']) {
      expect(
        GenplanSnapshotSchema.safeParse({
          ...snapshot({}),
          plots: [{ id: 'L43', status: 'Свободен', location: 'луговой', objectprice: value }]
        }).success
      ).toBe(false);
    }
  });

  it('uses the Moscow observation date and sorts a union without inferred features', () => {
    expect(mapGenplanSnapshot(snapshot({}, '2026-09-22T22:45:00Z')).observedOn).toBe('2026-09-23');
    expect(mapGenplanSnapshot(snapshot({}, '2026-09-22T01:30:00+03:00')).observedOn).toBe(
      '2026-09-22'
    );
    expect(sortParcelFeatures(['forest_view', 'forest_border', 'forest_view']))
      .toMatchInlineSnapshot(`
      [
        "forest_border",
        "forest_view",
      ]
    `);
  });
});

import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, readFile, readdir, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { mapGenplanSnapshot } from '../genplan-mapper';
import { parseGenplanPage } from '../genplan-page';
import { reconcileParcels } from '../reconcile';
import { resolveParcels } from '../resolve';
import { GenplanSnapshotSchema, RawNspdFeatureSchema } from '../source-schemas';
import type { ConfirmedMatches, MappedGenplanSnapshot, NspdSnapshot } from '../source-types';
import { readSavedParcels, writeAtomic, writeParcelUpdate } from '../update-files';
import { formatParcelUpdate } from '../update-report';
import type { SavedParcel } from '../update-types';

const a = '50:33:0010101:2998';
const b = '50:33:0010101:2999';
const c = '50:33:0010101:3000';
const square = [
  [4_200_000, 7_370_000],
  [4_200_100, 7_370_000],
  [4_200_100, 7_370_100],
  [4_200_000, 7_370_000]
];
const nspd = (numbers: readonly string[], width = 100): NspdSnapshot => ({
  metadata: {
    source: 'https://nspd.gov.ru/map',
    endpoint: 'https://nspd.gov.ru/api/',
    method: 'POST',
    capturedOn: '2026-09-22',
    savedAt: '2026-09-22T00:00:00Z',
    geometryCrs: 'EPSG:3857',
    queryCrs: 'EPSG:4326',
    queryRing4326: [
      [37, 55],
      [38, 55],
      [38, 56],
      [37, 55]
    ],
    viewportBounds3857: [1, 2, 3, 4],
    response: { featureCount: numbers.length, coverageVerified: true }
  },
  features: numbers.map((number, id) =>
    RawNspdFeatureSchema.parse({
      type: 'Feature',
      id: id + 1,
      geometry: {
        type: 'Polygon',
        coordinates: [[...square.slice(0, -1), [4_200_000, 7_370_000 + width], square[0]]],
        crs: { type: 'name', properties: { name: 'EPSG:3857' } }
      },
      properties: { cadastralNumber: number, area: 2150, status: 'Учтенный' }
    })
  )
});

const plans = (
  plots: readonly Record<string, unknown>[],
  capturedAt = '2026-09-22T12:00:00+03:00'
): readonly MappedGenplanSnapshot[] => [
  mapGenplanSnapshot(
    GenplanSnapshotSchema.parse({
      part: 'shr',
      page: 'https://dgtime.ru/shr/shr-genplan/',
      capturedAt,
      plots: plots.map((plot) => ({ status: 'Свободен', location: 'луговой', ...plot }))
    })
  )
];

const match = (
  codes: readonly string[],
  number: string,
  references: Record<string, string>,
  primary?: string
): ConfirmedMatches => [
  {
    codes: [...codes],
    cadastral_number: number,
    source_cadastral_references: references,
    primary_code: primary,
    evidence: 'Подтверждение редактора'
  }
];

const saved = (
  update: ReturnType<typeof reconcileParcels>,
  body = 'Заметка **дословно**.\n\nВторой абзац.\n'
): readonly SavedParcel[] =>
  update.records.map((record) => ({ path: record.path, data: record.data, body }));

describe('parcel matching and updating', () => {
  it('matches exact references and confirmed aliases, but never guesses from a nearby contour', () => {
    const sources = plans([
      { id: 'L43', cadastralReference: b },
      { id: 'L44', cadastralReference: c },
      { id: 'L45', cadastralReference: a },
      { id: 'L46' }
    ]);
    const confirmed = match(['SHR-L43', 'SHR-L44'], b, { 'SHR-L43': b, 'SHR-L44': c }, 'SHR-L43');
    const resolution = resolveParcels(sources, nspd([a, b]), confirmed);
    expect({
      groups: resolution.candidates.map((item) => item.plots.map((plot) => plot.code)),
      unresolved: resolution.unresolved,
      conflicts: resolution.conflicts
    }).toMatchInlineSnapshot(`
      {
        "conflicts": [],
        "groups": [
          [
            "SHR-L45",
          ],
          [
            "SHR-L43",
            "SHR-L44",
          ],
        ],
        "unresolved": [
          "SHR-L46: unmatched reference undefined",
        ],
      }
    `);
    const changed = plans([
      { id: 'L43', cadastralReference: b },
      { id: 'L44', cadastralReference: a }
    ]);
    expect(resolveParcels(changed, nspd([a, b]), confirmed).conflicts).toContain(
      'SHR-L43: confirmed reference changed for SHR-L44: 50:33:0010101:2998 (was 50:33:0010101:3000)'
    );
  });

  it('keeps confirmed parcels when a direct collision arrives before or after them', () => {
    const confirmed = match(['SHR-L43'], a, { 'SHR-L43': a });
    const original = saved(
      reconcileParcels(plans([{ id: 'L43', cadastralReference: a }]), nspd([a]), confirmed, [])
    );
    for (const plots of [
      [
        { id: 'L45', cadastralReference: a },
        { id: 'L43', cadastralReference: a }
      ],
      [
        { id: 'L43', cadastralReference: a },
        { id: 'L45', cadastralReference: a }
      ]
    ]) {
      const sources = plans(plots);
      const resolution = resolveParcels(sources, nspd([a]), confirmed);
      expect({
        candidates: resolution.candidates.map(({ plots }) => plots.map(({ code }) => code)),
        conflicts: resolution.conflicts
      }).toMatchInlineSnapshot(`
        {
          "candidates": [
            [
              "SHR-L43",
            ],
          ],
          "conflicts": [
            "SHR-L45: direct reference collides with confirmed group 50:33:0010101:2998",
          ],
        }
      `);
      const update = reconcileParcels(sources, nspd([a]), confirmed, original);
      expect(update.deleted).toEqual([]);
      expect(update.records[0]?.data.code).toBe('SHR-L43');
    }
  });

  it('keeps the cadastral record through boundary change and merge; requires selection for a new number', () => {
    const first = reconcileParcels(
      plans([
        { id: 'L43', cadastralReference: a, objectprice: 100 },
        { id: 'L44', cadastralReference: b, objectprice: 200 }
      ]),
      nspd([a, b]),
      [],
      []
    );
    const old = first.records.map((record, index) => ({
      path: record.path,
      data: record.data,
      body: index ? 'Отдельная заметка L44.\n' : 'Заметка **дословно**.\n\nВторой абзац.\n'
    }));
    const second = reconcileParcels(
      plans([
        { id: 'L43', cadastralReference: a, objectprice: 300 },
        { id: 'L44', cadastralReference: b, objectprice: 400 }
      ]),
      nspd([a, b], 120),
      [],
      old
    );
    expect(second.geometryChanged).toEqual(['shr/l/l43.md', 'shr/l/l44.md']);
    const linked = match(['SHR-L43', 'SHR-L44'], a, { 'SHR-L43': a, 'SHR-L44': b }, 'SHR-L43');
    const merge = reconcileParcels(
      plans([
        { id: 'L43', cadastralReference: a, objectprice: 300 },
        { id: 'L44', cadastralReference: b, objectprice: 400 }
      ]),
      nspd([a]),
      linked,
      old
    );
    expect({
      kept: merge.records.map((record) => [
        record.path,
        record.data.aliases,
        record.body,
        record.data.price_history
      ]),
      removed: merge.deleted,
      priceConflict: merge.conflicts
    }).toMatchInlineSnapshot(`
      {
        "kept": [
          [
            "shr/l/l43.md",
            [
              "SHR-L44",
            ],
            "Заметка **дословно**.

      Второй абзац.
      ",
            [
              {
                "on": "2026-09-22",
                "price": 100,
              },
            ],
          ],
        ],
        "priceConflict": [
          "SHR-L43: part prices SHR-L43=300, SHR-L44=400; kept 100 (whole-parcel price unconfirmed)",
        ],
        "removed": [
          "shr/l/l44.md",
        ],
      }
    `);
    const unchosen = reconcileParcels(
      plans([
        { id: 'L43', cadastralReference: a },
        { id: 'L44', cadastralReference: b }
      ]),
      nspd([c]),
      match(['SHR-L43', 'SHR-L44'], c, { 'SHR-L43': a, 'SHR-L44': b }),
      old
    );
    expect(unchosen.records).toEqual([]);
    expect(unchosen.unresolved[0]).toContain('choose primary_code');
    const chosen = reconcileParcels(
      plans([
        { id: 'L43', cadastralReference: a },
        { id: 'L44', cadastralReference: b }
      ]),
      nspd([c]),
      match(['SHR-L43', 'SHR-L44'], c, { 'SHR-L43': a, 'SHR-L44': b }, 'SHR-L44'),
      old
    );
    expect(chosen.records[0]?.body).toBe(old[1]?.body);
    expect(chosen.records[0]?.body).not.toBe(old[0]?.body);
    expect(chosen.records[0]?.data.code).toBe('SHR-L44');
    expect(chosen.records[0]?.data.price_history).toEqual(old[1]?.data.price_history);
  });

  it('splits without moving the former shared note/history, and drops vanished aliases, codes, or contours', () => {
    const source = plans([
      { id: 'L43', cadastralReference: a, objectprice: 100 },
      { id: 'L44', cadastralReference: b, objectprice: 200 }
    ]);
    const linked = match(['SHR-L43', 'SHR-L44'], a, { 'SHR-L43': a, 'SHR-L44': b }, 'SHR-L43');
    const first = saved(reconcileParcels(source, nspd([a]), linked, []));
    expect(first[0]?.data.price_history).toEqual([]);
    const aliasGone = reconcileParcels(
      plans([{ id: 'L43', cadastralReference: a }]),
      nspd([a]),
      linked,
      first
    );
    expect(aliasGone.records[0]?.data.aliases).toEqual([]);
    const primaryGone = reconcileParcels(
      plans([{ id: 'L44', cadastralReference: b }]),
      nspd([a]),
      linked,
      first
    );
    expect([
      primaryGone.renamed,
      primaryGone.records[0]?.body,
      primaryGone.records[0]?.data.price_history
    ]).toMatchInlineSnapshot(`
        [
          [
            "shr/l/l43.md -> shr/l/l44.md",
          ],
          "Заметка **дословно**.

        Второй абзац.
        ",
          [],
        ]
      `);
    const split = reconcileParcels(source, nspd([a, b]), [], first);
    expect(
      split.records.map((record) => ({
        path: record.path,
        body: record.body,
        history: record.data.price_history
      }))
    ).toMatchInlineSnapshot(`
        [
          {
            "body": "",
            "history": [
              {
                "on": "2026-09-22",
                "price": 100,
              },
            ],
            "path": "shr/l/l43.md",
          },
          {
            "body": "",
            "history": [
              {
                "on": "2026-09-22",
                "price": 200,
              },
            ],
            "path": "shr/l/l44.md",
          },
        ]
      `);
    expect(
      reconcileParcels(plans([{ id: 'L43', cadastralReference: a }]), nspd([b]), [], first).deleted
    ).toEqual(['shr/l/l43.md']);
    expect(
      reconcileParcels(plans([{ id: 'L45', cadastralReference: b }]), nspd([a, b]), [], first)
        .deleted
    ).toEqual(['shr/l/l43.md']);
  });

  it('keeps ambiguous status, unions features, and only observes a confirmed whole-parcel price', () => {
    const sources = plans([
      {
        id: 'L43',
        cadastralReference: a,
        location: 'с видом на лес',
        status: 'Свободен',
        objectprice: 100
      },
      { id: 'L44', cadastralReference: b, location: 'с прудом', status: 'Продан', objectprice: 200 }
    ]);
    const confirmed = match(['SHR-L43', 'SHR-L44'], a, { 'SHR-L43': a, 'SHR-L44': b }, 'SHR-L43');
    const initial = reconcileParcels(sources, nspd([a]), confirmed, []);
    expect(initial.records[0]?.data.status).toBeUndefined();
    expect(initial.records[0]?.data.features).toEqual(['forest_view', 'pond']);
    expect(initial.conflicts[0]).toContain('statuses');
    expect(formatParcelUpdate(initial, nspd([a]))).toContain('Конфликты: 1');
    const withPrice: ConfirmedMatches = [
      {
        ...confirmed[0]!,
        price_source_code: 'SHR-L43',
        price_evidence: 'Цена целого подтверждена'
      }
    ];
    const sameStatus = plans([
      { id: 'L43', cadastralReference: a, objectprice: 100 },
      { id: 'L44', cadastralReference: b, objectprice: 200 }
    ]);
    const observed = reconcileParcels(sameStatus, nspd([a]), withPrice, saved(initial));
    expect(observed.records[0]?.data.price_history).toEqual([{ on: '2026-09-22', price: 100 }]);
    expect(
      reconcileParcels(sameStatus, nspd([a]), withPrice, saved(observed)).records[0]?.data
        .price_history
    ).toEqual(observed.records[0]?.data.price_history);
    const changed = reconcileParcels(
      plans(
        [
          { id: 'L43', cadastralReference: a, objectprice: 200 },
          { id: 'L44', cadastralReference: b, objectprice: 200 }
        ],
        '2026-09-23T12:00:00+03:00'
      ),
      nspd([a]),
      withPrice,
      saved(observed)
    );
    const returned = reconcileParcels(
      plans(
        [
          { id: 'L43', cadastralReference: a, objectprice: 100 },
          { id: 'L44', cadastralReference: b, objectprice: 200 }
        ],
        '2026-09-24T12:00:00+03:00'
      ),
      nspd([a]),
      withPrice,
      saved(changed)
    );
    expect(returned.records[0]?.data.price_history).toMatchInlineSnapshot(`
      [
        {
          "on": "2026-09-22",
          "price": 100,
        },
        {
          "on": "2026-09-23",
          "price": 200,
        },
        {
          "on": "2026-09-24",
          "price": 100,
        },
      ]
    `);
    // An older accepted genplan cannot add a stale price during a cadastral-only update.
    const oldPlan = reconcileParcels(sameStatus, nspd([a]), withPrice, saved(changed));
    expect(oldPlan.records[0]?.data.price_history).toEqual(changed.records[0]?.data.price_history);
    const sold = reconcileParcels(
      plans([
        { id: 'L43', cadastralReference: a, objectprice: 999, status: 'Продан' },
        { id: 'L44', cadastralReference: b, objectprice: 999, status: 'Продан' }
      ]),
      nspd([a]),
      withPrice,
      saved(observed)
    );
    expect(sold.records[0]?.data.price_history).toEqual(observed.records[0]?.data.price_history);
    const unavailable = reconcileParcels(
      plans([
        { id: 'L43', cadastralReference: a, objectprice: 999, status: 'Снят с продажи' },
        { id: 'L44', cadastralReference: b, objectprice: 999, status: 'Снят с продажи' }
      ]),
      nspd([a]),
      withPrice,
      saved(observed)
    );
    expect(unavailable.records[0]?.data.price_history).toEqual(
      observed.records[0]?.data.price_history
    );
    const backOnSale = reconcileParcels(
      plans(
        [
          { id: 'L43', cadastralReference: a, objectprice: 300, status: 'Забронирован' },
          { id: 'L44', cadastralReference: b, objectprice: 999, status: 'Забронирован' }
        ],
        '2026-09-23T12:00:00+03:00'
      ),
      nspd([a]),
      withPrice,
      saved(unavailable)
    );
    expect(backOnSale.records[0]?.data.price_history.at(-1)).toEqual({
      on: '2026-09-23',
      price: 300
    });
    const zero = reconcileParcels(
      plans([
        { id: 'L43', cadastralReference: a, objectprice: 0 },
        { id: 'L44', cadastralReference: b, objectprice: 0 }
      ]),
      nspd([a]),
      withPrice,
      saved(observed)
    );
    expect(zero.records[0]?.data.price_history).toEqual(observed.records[0]?.data.price_history);
    const missing = reconcileParcels(
      plans([
        { id: 'L43', cadastralReference: a },
        { id: 'L44', cadastralReference: b }
      ]),
      nspd([a]),
      withPrice,
      saved(observed)
    );
    expect(missing.records[0]?.data.price_history).toEqual(observed.records[0]?.data.price_history);
  });

  it('parses exactly one JSON assignment without executing surrounding JavaScript', () => {
    const json = JSON.stringify([
      { id: 'L43', cadastral_number: a, status: 'Свободен', location: 'луговой', objectprice: 100 }
    ]);
    const html = `<script>window['houses_data'] = ${json}</script>`;
    expect(
      parseGenplanPage(html, 'shr', 'https://example.org/', '2026-09-22T12:00:00Z').plots[0]?.id
    ).toBe('L43');
    expect(
      parseGenplanPage(
        html.replace('Свободен', '  Свободен  '),
        'shr',
        'https://example.org/',
        '2026-09-22T12:00:00Z'
      ).plots[0]?.status
    ).toBe('Свободен');
    expect(
      parseGenplanPage(
        `<!-- ${html} --><script data-description="a > b">window['houses_data'] = ${json}</script>`,
        'shr',
        'https://example.org/',
        '2026-09-22T12:00:00Z'
      ).plots[0]?.id
    ).toBe('L43');
    expect(() =>
      parseGenplanPage(
        `<!-- ${html} --><div data-example="<script>window['houses_data'] = []</script>"></div>`,
        'shr',
        'https://example.org/',
        '2026-09-22T12:00:00Z'
      )
    ).toThrow('exactly one');
    expect(() =>
      parseGenplanPage(`${html}${html}`, 'shr', 'https://example.org/', '2026-09-22T12:00:00Z')
    ).toThrow('exactly one');
    expect(() =>
      parseGenplanPage('<h1>Error</h1>', 'shr', 'https://example.org/', '2026-09-22T12:00:00Z')
    ).toThrow('exactly one');
    expect(() =>
      parseGenplanPage(
        `<script>window['houses_data'] = ${json}; globalThis.x = true</script>`,
        'shr',
        'https://example.org/',
        '2026-09-22T12:00:00Z'
      )
    ).toThrow('unsupported');
    expect(() =>
      parseGenplanPage(
        '<script>window["houses_data"] = []</script>',
        'shr',
        'https://example.org/',
        '2026-09-22T12:00:00Z'
      )
    ).toThrow('exactly one');
    expect(() =>
      parseGenplanPage(
        "<script>window['houses_data'] = [broken]</script>",
        'shr',
        'https://example.org/',
        '2026-09-22T12:00:00Z'
      )
    ).toThrow();
    expect(() =>
      parseGenplanPage(
        "<script>window['houses_data'] = []</script>",
        'shr',
        'https://example.org/',
        '2026-09-22T12:00:00Z'
      )
    ).toThrow();
  });

  it('writes files atomically, preserves Markdown text, and repeats without file changes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'parcel-update-'));
    try {
      const first = reconcileParcels(
        plans([{ id: 'L43', cadastralReference: a, objectprice: 100 }]),
        nspd([a]),
        [],
        []
      );
      const body = 'Заметка **дословно**.\n\nВторой абзац.\n';
      await writeParcelUpdate(directory, {
        ...first,
        records: first.records.map((record) => ({ ...record, body }))
      });
      const stored = await readSavedParcels(directory);
      const content = await readFile(join(directory, 'shr/l/l43.md'), 'utf8');
      expect(content).not.toContain('aliases: []');
      expect(stored[0]?.data.aliases).toEqual([]);
      const repeated = reconcileParcels(
        plans([{ id: 'L43', cadastralReference: a, objectprice: 100 }]),
        nspd([a]),
        [],
        stored
      );
      await writeParcelUpdate(directory, repeated);
      expect(await readFile(join(directory, 'shr/l/l43.md'), 'utf8')).toBe(content);
      expect(repeated.added).toEqual([]);
      const renamed = reconcileParcels(
        plans([{ id: 'M44', cadastralReference: a, objectprice: 100 }]),
        nspd([a]),
        [],
        stored
      );
      await writeParcelUpdate(directory, renamed);
      expect((await readSavedParcels(directory)).map((record) => record.path)).toEqual([
        'shr/m/m44.md'
      ]);
      expect((await readSavedParcels(directory))[0]?.body).toBe(body);
      expect((await readSavedParcels(directory))[0]?.data.price_history).toEqual(
        stored[0]?.data.price_history
      );
      expect(renamed.renamed).toEqual(['shr/l/l43.md -> shr/m/m44.md']);
      expect(formatParcelUpdate(renamed, nspd([a]))).toContain('Переименованы: 1');
      expect(formatParcelUpdate(first, nspd([a]))).toContain('Добавлены: 1');
      expect(formatParcelUpdate(renamed, nspd([a]))).toContain('Удалены: 1');
      expect(
        formatParcelUpdate(reconcileParcels(plans([{ id: 'L43' }]), nspd([a]), [], []), nspd([a]))
      ).toContain('Не сопоставлены: 1');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('replaces one file through a temporary sibling and leaves no temporary file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'parcel-atomic-'));
    try {
      const path = join(directory, 'genplans/shr.json');
      await writeAtomic(path, '{"part":"shr"}\n');
      await writeAtomic(path, '{"part":"shf"}\n');
      expect(await readFile(path, 'utf8')).toBe('{"part":"shf"}\n');
      expect(await readdir(join(directory, 'genplans'))).toEqual(['shr.json']);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('exits before touching accepted files when one of four saved pages is malformed', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'parcel-invalid-'));
    const sources = new URL('../../../data/parcel-sources/', import.meta.url);
    const original = await readFile(new URL('genplans/shr.json', sources), 'utf8');
    try {
      await mkdir(join(directory, 'genplans'));
      for (const part of ['shr', 'shf', 'shp']) {
        await writeFile(
          join(directory, 'genplans', `${part}.json`),
          JSON.stringify({
            part,
            page: `https://example.org/${part}`,
            capturedAt: '2026-09-24T12:00:00Z',
            plots: [{ id: 'L43', status: 'Свободен', location: 'луговой' }]
          })
        );
      }
      await writeFile(join(directory, 'genplans/shv.json'), '<h1>service failure</h1>');
      const script = new URL('../../../../scripts/parcels/update.ts', import.meta.url);
      const result = spawnSync(
        process.execPath,
        [script.pathname, 'genplans', '--snapshot', directory],
        {
          encoding: 'utf8',
          cwd: new URL('../../../../../', import.meta.url).pathname
        }
      );
      expect(result.status).not.toBe(0);
      expect(await readFile(new URL('genplans/shr.json', sources), 'utf8')).toBe(original);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects changed metadata for an unverified cadastral repeat without changing accepted data', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'parcel-nspd-'));
    const sources = new URL('../../../data/parcel-sources/', import.meta.url);
    const accepted = await readFile(new URL('nspd.json', sources), 'utf8');
    try {
      await copyFile(new URL('nspd.ndjson', sources), join(directory, 'nspd.ndjson'));
      const metadata = JSON.parse(accepted);
      metadata.capturedOn = '2026-09-24';
      await writeFile(join(directory, 'nspd.json'), JSON.stringify(metadata));
      const script = new URL('../../../../scripts/parcels/update.ts', import.meta.url);
      const result = spawnSync(
        process.execPath,
        [script.pathname, 'nspd', '--snapshot', directory],
        { encoding: 'utf8', cwd: new URL('../../../../../', import.meta.url).pathname }
      );
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('verify the new cadastral response coverage');
      expect(await readFile(new URL('nspd.json', sources), 'utf8')).toBe(accepted);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

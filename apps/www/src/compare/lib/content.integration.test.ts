import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { getTariffCalc } from './format';
import { SettlementSchema } from './schema';
import { mapRawSettlement } from './settlement/mapper';

const dir = fileURLToPath(new URL('../../data/compare/settlements/', import.meta.url));

function list() {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.yaml') && !name.startsWith('_'))
    .map((name) => ({
      name,
      code: readFileSync(join(dir, name), 'utf-8')
    }));
}

const parseSlug = (code: string): string => SettlementSchema.parse(parseYaml(code)).slug;

const explainedAmount = (text: string): number =>
  Number(
    text
      .match(/([\d\s,]+)₽\/сотка в месяц$/)?.[1]
      .replace(/\s/g, '')
      .replace(',', '.')
  );

function findDuplicateSlugs(files: ReturnType<typeof list>) {
  const filesBySlug = new Map<string, string[]>();

  for (const file of files) {
    const slug = parseSlug(file.code);
    const names = filesBySlug.get(slug);

    if (names) {
      names.push(file.name);
    } else {
      filesBySlug.set(slug, [file.name]);
    }
  }

  return [...filesBySlug.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([slug, names]) => ({ slug, files: names }));
}

function parseBase(code: string): boolean | undefined {
  const v = code.match(/^is_baseline:\s*(true|false)\s*$/m)?.[1];
  if (!v) {
    return;
  }

  return v === 'true';
}

describe('settlements content collection', () => {
  it('does not include settlement-slug in route data', () => {
    const slugs = list().map((file) => parseSlug(file.code));

    expect(slugs).not.toContain('settlement-slug');
  });

  it('uses unique slug values', () => {
    const duplicates = findDuplicateSlugs(list());
    const conflicts = duplicates
      .map(({ slug, files }) => `${slug}: ${files.join(', ')}`)
      .join('; ');

    expect(duplicates, `Duplicate slugs: ${conflicts}`).toEqual([]);
  });

  it('detects duplicate parsed slugs across valid YAML spellings', () => {
    const source = list().find((file) => file.name === 'shelkovo.yaml');
    if (!source) {
      throw new Error('shelkovo.yaml fixture not found');
    }

    const files = [
      { name: 'comment.yaml', code: 'slug: semantic-duplicate # comment' },
      { name: 'spaces.yaml', code: 'slug: semantic-duplicate  ' },
      { name: 'quoted.yaml', code: 'slug: "semantic-duplicate"' }
    ].map(({ name, code }) => ({
      name,
      code: source.code.replace(/^slug:.*$/m, code)
    }));

    expect(findDuplicateSlugs(files)).toMatchInlineSnapshot(`
      [
        {
          "files": [
            "comment.yaml",
            "spaces.yaml",
            "quoted.yaml",
          ],
          "slug": "semantic-duplicate",
        },
      ]
    `);
  });

  it('has exactly one baseline settlement', () => {
    const rows = list().map((file) => ({
      name: file.name,
      base: parseBase(file.code)
    }));

    const miss = rows.filter((row) => row.base === undefined).map((row) => row.name);
    expect(miss, `Missing is_baseline in files: ${miss.join(', ')}`).toEqual([]);

    const base = rows.filter((row) => row.base).map((row) => row.name);
    expect(base, `Baseline files: ${base.join(', ')}`).toHaveLength(1);
  });

  it('agrees with the displayed parts and total for every tariff explanation', () => {
    const files = list();
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const raw = SettlementSchema.parse(parseYaml(file.code));
      const settlement = mapRawSettlement(raw);
      const calc = getTariffCalc(
        settlement.tariff,
        settlement.lots,
        settlement.infrastructure,
        settlement.commonSpaces
      );

      expect(raw.tariff).not.toHaveProperty('normalized_per_sotka_month');
      if (!calc) {
        expect(settlement.tariff.normalizedIsEstimate, file.name).toBe(false);
        expect(settlement.tariff.parts, file.name).toBeUndefined();
        continue;
      }

      const total = explainedAmount(calc.total);
      const partsTotal = calc.rows.reduce((sum, row) => sum + explainedAmount(row.formula), 0);

      expect(total, file.name).toBeCloseTo(settlement.tariff.normalizedPerSotkaMonth, 2);
      // Each displayed amount is rounded to two decimals; the domain sum is not.
      expect(Math.abs(partsTotal - total), file.name).toBeLessThanOrEqual(
        (calc.rows.length + 1) * 0.005 + Number.EPSILON
      );
    }
  });
});

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load as parseYaml } from 'js-yaml';

import { SettlementSchema } from './schema';

const dir = join(process.cwd(), 'src/data/compare/settlements');

function list() {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.yaml') && !name.startsWith('_'))
    .map((name) => ({
      name,
      code: readFileSync(join(dir, name), 'utf-8'),
    }));
}

const parseSlug = (name: string, code: string): string =>
  SettlementSchema.parse(parseYaml(code, { filename: name })).slug;

function findDuplicateSlugs(files: ReturnType<typeof list>) {
  const filesBySlug = new Map<string, string[]>();

  for (const file of files) {
    const slug = parseSlug(file.name, file.code);
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
    const slugs = list().map((file) => parseSlug(file.name, file.code));

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
      { name: 'quoted.yaml', code: 'slug: "semantic-duplicate"' },
    ].map(({ name, code }) => ({
      name,
      code: source.code.replace(/^slug:.*$/m, code),
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
      base: parseBase(file.code),
    }));

    const miss = rows
      .filter((row) => row.base === undefined)
      .map((row) => row.name);
    expect(miss, `Missing is_baseline in files: ${miss.join(', ')}`).toEqual(
      [],
    );

    const base = rows.filter((row) => row.base).map((row) => row.name);
    expect(base, `Baseline files: ${base.join(', ')}`).toHaveLength(1);
  });
});

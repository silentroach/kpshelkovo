import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';

import { parse, stringify, Scalar } from 'yaml';

import { RawParcelSchema } from './raw-schema.ts';
import type { ParcelUpdate, SavedParcel } from './update-types.ts';

const parseRecord = (source: string, path: string): SavedParcel => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);
  if (!match) throw new Error(`${path}: missing Markdown frontmatter`);
  const data = RawParcelSchema.parse(parse(match[1] ?? ''));
  if (path !== `${data.code.toLowerCase().replace('-', '/')}.md`)
    throw new Error(`${path}: path does not match ${data.code}`);
  return { path, data, body: source.slice(match[0].length) };
};

export const readSavedParcels = async (directory: string): Promise<readonly SavedParcel[]> => {
  const records: SavedParcel[] = [];
  for (const part of ['shr', 'shf', 'shp', 'shv']) {
    const folder = join(directory, part);
    const files = await readdir(folder).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    for (const file of files.filter((file) => file.endsWith('.md')).sort()) {
      const path = `${part}/${file}`;
      records.push(parseRecord(await readFile(join(directory, path), 'utf8'), path));
    }
  }
  const used = new Set<string>();
  const numbers = new Set<string>();
  for (const record of records) {
    for (const code of [record.data.code, ...record.data.aliases]) {
      if (used.has(code)) throw new Error(`duplicate saved code ${code}`);
      used.add(code);
    }
    if (numbers.has(record.data.cadastral_number))
      throw new Error(`duplicate saved cadastral number ${record.data.cadastral_number}`);
    numbers.add(record.data.cadastral_number);
  }
  return records;
};

export const writeAtomic = async (file: string, text: string): Promise<void> => {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, text, { flag: 'wx' });
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
};

export const writeParcelUpdate = async (directory: string, update: ParcelUpdate): Promise<void> => {
  for (const record of update.records) {
    const file = join(directory, record.path);
    // Astro's Markdown frontmatter reader interprets unquoted YAML ISO dates as Date objects.
    const data = {
      ...record.data,
      price_history: record.data.price_history.map(({ on, price }) => {
        const quoted = new Scalar(on);
        quoted.type = Scalar.QUOTE_DOUBLE;
        return { on: quoted, price };
      })
    };
    const text = `---\n${stringify(data, { lineWidth: 0 })}---\n${record.body}`;
    const old = await readFile(file, 'utf8').catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    });
    if (old !== text) await writeAtomic(file, text);
  }
  for (const path of update.deleted) await rm(join(directory, path));
};

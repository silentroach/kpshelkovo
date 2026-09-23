import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import * as pagefind from 'pagefind';

import { ParcelMapPublicSchema } from '../src/lib/parcels/map-public-schema.ts';

const site = resolve('dist/site');
const output = resolve(process.argv[2] ?? 'dist/site/search');
const failOnErrors = (errors: readonly string[]): void => {
  if (errors.length) throw new Error(errors.join('\n'));
};

try {
  const parcels = ParcelMapPublicSchema.parse(
    JSON.parse(await readFile(resolve(site, 'map/data/parcels.json'), 'utf8'))
  );
  const codes = new Set<string>();
  for (const parcel of parcels) {
    for (const code of [parcel.code, ...(parcel.aliases ?? [])]) {
      if (codes.has(code)) throw new Error(`Duplicate parcel designation: ${code}`);
      codes.add(code);
    }
  }

  const created = await pagefind.createIndex({ rootSelector: '[data-pagefind-root]' });
  failOnErrors(created.errors);
  if (!created.index) throw new Error('Pagefind did not create an index');
  const index = created.index;
  const directory = await index.addDirectory({ path: site });
  failOnErrors(directory.errors);
  if (!directory.page_count) throw new Error('Pagefind did not index HTML pages');

  for (const parcel of parcels) {
    const aliases = parcel.aliases ?? [];
    const designation = [parcel.code, ...aliases];
    const record = await index.addCustomRecord({
      url: `/map/?p=${parcel.code}`,
      content: parcel.code,
      language: 'ru',
      meta: {
        title: parcel.code,
        sectionId: 'parcels',
        sectionLabel: 'Участки',
        part: parcel.part,
        aliases: aliases.join(',')
      },
      filters: {
        section: ['parcels'],
        parcelCode: designation.flatMap((code) => [code, code.slice(code.indexOf('-') + 1)])
      }
    });
    failOnErrors(record.errors);
  }

  failOnErrors((await index.writeFiles({ outputPath: output })).errors);
  console.info(
    `Indexed ${directory.page_count} HTML pages and ${parcels.length} parcels at ${output}`
  );
} finally {
  await pagefind.close();
}

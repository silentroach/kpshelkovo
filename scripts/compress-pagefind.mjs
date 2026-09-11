import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';

const directory = process.argv[2];
if (!directory) {
  throw new Error('Pagefind output directory is required');
}

const files = (await readdir(directory, { recursive: true, withFileTypes: true })).filter(
  (entry) => entry.isFile() && ['.js', '.css', '.json'].includes(extname(entry.name))
);
if (!files.length) {
  throw new Error(`No Pagefind text assets found in ${directory}`);
}

const compressGzip = promisify(gzip);
const compressBrotli = promisify(brotliCompress);
const start = performance.now();

for (const entry of files) {
  const path = join(entry.parentPath, entry.name);
  const source = await readFile(path);
  // Match astro-compressor's site-wide levels; Pagefind's binary formats stay untouched.
  await writeFile(`${path}.gz`, await compressGzip(source, { level: 9 }));
  await writeFile(
    `${path}.br`,
    await compressBrotli(source, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })
  );
}

console.info(
  `Precompressed ${files.length} Pagefind text assets in ${Math.round(performance.now() - start)}ms`
);

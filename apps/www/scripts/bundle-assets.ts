import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';

import { parse, stringify } from 'yaml';

const workspace = new URL('../../../', import.meta.url);
const output = new URL('dist/www/', workspace);
const clientReport = new URL('docs/bundle/client.yaml', workspace);
const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const stableName = (file: string): string =>
  file.replace(/\.[\w-]{8}(?=\.(?:js|css)$)/, '.XXXXXXXX');
const numberedName = (file: string, number: number): string =>
  file.replace(/\.XXXXXXXX(?=\.(?:js|css)$)/, `-${number}.XXXXXXXX`);

const chunks = Object.entries(
  parse(await readFile(clientReport, 'utf8')) as Record<string, Record<string, unknown>>
).sort(
  ([fileA, modulesA], [fileB, modulesB]) =>
    compare(stableName(fileA), stableName(fileB)) ||
    compare(Object.keys(modulesA).sort().join(), Object.keys(modulesB).sort().join())
);
const chunkNames = new Map<string, string>();
const chunkCounts = new Map<string, number>();
const stableChunks = Object.fromEntries(
  chunks.map(([file, modules]) => {
    const name = stableName(file);
    const count = (chunkCounts.get(name) ?? 0) + 1;
    chunkCounts.set(name, count);
    const uniqueName = count === 1 ? name : numberedName(name, count);
    chunkNames.set(file, uniqueName);
    return [uniqueName, modules];
  })
);

const files = (await readdir(new URL('static/', output), { recursive: true }))
  .filter((file) => /\.(?:js|css)$/.test(file))
  .sort();
const cssOwners = new Map<string, string>();
const pages = (await readdir(output, { recursive: true }))
  .filter((file) => file.endsWith('.html'))
  .sort();
for (const page of pages) {
  const html = await readFile(new URL(page, output), 'utf8');
  for (const [, file] of html.matchAll(/\/static\/([^"'\s>]+\.css)/g)) {
    if (file && !cssOwners.has(file)) cssOwners.set(file, page);
  }
}
const assets = (
  await Promise.all(
    files.map(async (file) => {
      const url = new URL(`static/${file}`, output);
      const [raw, brotli, gzip] = await Promise.all(
        [url, new URL(`${url}.br`), new URL(`${url}.gz`)].map((asset) => stat(asset))
      );
      return {
        file: chunkNames.get(`static/${file}`) ?? stableName(`static/${file}`),
        owner: cssOwners.get(file) ?? '',
        bytes: raw.size,
        brotli: brotli.size,
        gzip: gzip.size
      };
    })
  )
).sort(
  (a, b) =>
    compare(a.file, b.file) ||
    compare(a.owner, b.owner) ||
    a.bytes - b.bytes ||
    a.brotli - b.brotli ||
    a.gzip - b.gzip
);

const assetCounts = new Map<string, number>();
for (const asset of assets) assetCounts.set(asset.file, (assetCounts.get(asset.file) ?? 0) + 1);
const assetIndices = new Map<string, number>();
const stableAssets = assets.map((asset) => {
  const index = (assetIndices.get(asset.file) ?? 0) + 1;
  assetIndices.set(asset.file, index);
  return {
    file: assetCounts.get(asset.file) === 1 ? asset.file : numberedName(asset.file, index),
    bytes: asset.bytes,
    brotli: asset.brotli,
    gzip: asset.gzip
  };
});

await mkdir(new URL('docs/bundle/', workspace), { recursive: true });
await writeFile(clientReport, stringify(stableChunks));
await writeFile(new URL('docs/bundle/assets.yaml', workspace), stringify(stableAssets));
console.info('Bundle reports: docs/bundle/{client,assets}.yaml; .cache/bundle/client.html');

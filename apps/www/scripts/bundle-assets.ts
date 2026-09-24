import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';

import { stringify } from 'yaml';

const workspace = new URL('../../../', import.meta.url);
const output = new URL('dist/www/', workspace);
const files = (await readdir(new URL('static/', output), { recursive: true }))
  .filter((file) => /\.(?:js|css)$/.test(file))
  .sort();
const assets = await Promise.all(
  files.map(async (file) => {
    const url = new URL(`static/${file}`, output);
    const [raw, brotli, gzip] = await Promise.all(
      [url, new URL(`${url}.br`), new URL(`${url}.gz`)].map((asset) => stat(asset))
    );
    return {
      file: `static/${file}`,
      bytes: raw.size,
      brotli: brotli.size,
      gzip: gzip.size
    };
  })
);

await mkdir(new URL('docs/bundle/', workspace), { recursive: true });
await writeFile(new URL('docs/bundle/assets.yaml', workspace), stringify(assets));
console.info('Bundle reports: docs/bundle/{client,assets}.yaml; .cache/bundle/client.html');

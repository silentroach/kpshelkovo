import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';

import { expect, onTestFinished, test } from 'vitest';

const script = fileURLToPath(new URL('../../../scripts/compress-pagefind.mjs', import.meta.url));
const execute = promisify(execFile);
const temporaryDirectory = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'pagefind-compression-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  return directory;
};

test('precompresses only text assets and replaces stale versions on rerun', async () => {
  const directory = await temporaryDirectory();
  const textFiles = ['pagefind.js', 'pagefind-ui.css', 'nested/entry.json'];
  const binaryFiles = [
    'wasm.ru.pagefind',
    'index.pf_index',
    'meta.pf_meta',
    'filter.pf_filter',
    'fragment.pf_fragment'
  ];
  const binary = Buffer.from([0, 255, 31, 139, 8]);
  await mkdir(join(directory, 'nested'));
  await Promise.all(binaryFiles.map((file) => writeFile(join(directory, file), binary)));

  for (const source of [Buffer.from('first generation'), Buffer.from('next generation — поиск')]) {
    await Promise.all(textFiles.map((file) => writeFile(join(directory, file), source)));
    await execute(process.execPath, [script, directory]);

    for (const file of textFiles) {
      const path = join(directory, file);
      expect(gunzipSync(await readFile(`${path}.gz`)).equals(source), `${file}.gz`).toBe(true);
      expect(brotliDecompressSync(await readFile(`${path}.br`)).equals(source), `${file}.br`).toBe(
        true
      );
      expect((await readFile(path)).equals(source), file).toBe(true);
    }
  }

  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  expect(entries.filter((entry) => entry.isFile())).toHaveLength(
    textFiles.length * 3 + binaryFiles.length
  );
  for (const file of binaryFiles) {
    expect((await readFile(join(directory, file))).equals(binary), file).toBe(true);
  }
});

test.each(['gz', 'br'])(
  'exits unsuccessfully when a .%s artifact cannot be written',
  async (extension) => {
    const directory = await temporaryDirectory();
    await writeFile(join(directory, 'pagefind.js'), 'search runtime');
    await mkdir(join(directory, `pagefind.js.${extension}`));

    await expect(execute(process.execPath, [script, directory])).rejects.toMatchObject({ code: 1 });
  }
);

test('rejects missing or empty output instead of reporting a successful build', async () => {
  const directory = await temporaryDirectory();
  for (const args of [[], [directory], [join(directory, 'missing')]]) {
    await expect(execute(process.execPath, [script, ...args])).rejects.toMatchObject({ code: 1 });
  }
});

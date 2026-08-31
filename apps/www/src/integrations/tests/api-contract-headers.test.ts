import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { collectPrerenderedApiContracts } from '@/lib/public-surface/api-contract';
import { publicSurfaceRegistry } from '@/lib/public-surface';
import { writeApiContractHeaders } from '../api-contract-headers';

const site = new URL('https://kpshelkovo.online');
const nginxConfigUrl = new URL(
  '../../../../../ops/nginx/kpshelkovo-online.conf',
  import.meta.url,
);
const temporaryDirectories: string[] = [];

const createOutput = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'api-contract-headers-'));
  const directory = join(root, 'site');
  temporaryDirectories.push(root);
  await mkdir(directory);

  return directory;
};

const writeContractArtifacts = async (directory: string): Promise<void> => {
  const contracts = collectPrerenderedApiContracts(
    publicSurfaceRegistry.slices,
    site.origin,
  );

  await Promise.all(
    contracts.map(async ({ path }) => {
      const file = join(directory, path);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, '{}');
    }),
  );
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

describe('API contract header integration', () => {
  it('writes exact locations with every contract media type and Link', async () => {
    const directory = await createOutput();
    await writeContractArtifacts(directory);

    await writeApiContractHeaders(pathToFileURL(`${directory}/`), site);

    const outputPath = join(directory, '../api-contract-headers.conf');
    const config = await readFile(outputPath, 'utf8');
    const contracts = collectPrerenderedApiContracts(
      publicSurfaceRegistry.slices,
      site.origin,
    );

    expect(config.match(/^location = /gmu)).toHaveLength(contracts.length);
    expect(config).not.toContain('location ~');

    for (const { path, mediaType, cacheControl, link } of contracts) {
      const location = config
        .split('\nlocation = ')
        .find((entry) => entry.startsWith(`${path} {`));

      expect(location).toContain('charset utf-8;');
      expect(location).toContain(`charset_types ${mediaType};`);
      expect(location).toContain(`default_type ${mediaType};`);
      expect(location).toContain(
        `add_header Cache-Control "${cacheControl}" always;`,
      );
      expect(location).toContain(
        `add_header Link "${link.replaceAll('"', '\\"')}" always;`,
      );
    }
    await expect(
      access(join(directory, 'api-contract-headers.conf')),
    ).rejects.toThrow();
  });

  it('keeps media types and contract Links out of broad nginx locations', async () => {
    const config = await readFile(nginxConfigUrl, 'utf8');

    expect(config).toContain(
      'include /etc/nginx/sites-available/kpshelkovo-online-api-contract-headers.conf;',
    );
    expect(config).not.toContain('default_type application/schema+json');
    expect(config).not.toContain(
      'default_type application/vnd.oai.openapi+json',
    );
    expect(config).not.toContain('$api_contract_link');
  });

  it('rejects a build missing any declared contract artifact', async () => {
    const directory = await createOutput();

    await expect(
      writeApiContractHeaders(pathToFileURL(`${directory}/`), site),
    ).rejects.toThrow();
  });
});

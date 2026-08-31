import { access, writeFile } from 'node:fs/promises';

import type { AstroIntegration } from 'astro';

import { collectPrerenderedApiContracts } from '@/lib/public-surface/api-contract';
import type { PrerenderedApiContract } from '@/lib/public-surface/api-contract.types';
import { publicSurfaceRegistry } from '@/lib/public-surface';

const EXPECTED_MEDIA_TYPES = [
  'application/json',
  'application/schema+json',
  'application/vnd.oai.openapi+json',
] as const;
const EXPECTED_OWNERS = [
  'compare',
  'news',
  'status',
  'people',
  'reglament',
] as const;
const SECURITY_HEADERS = [
  'add_header Strict-Transport-Security $security_hsts always;',
  'add_header X-Content-Type-Options $security_content_type always;',
  'add_header X-Frame-Options $security_frame_options always;',
  'add_header Referrer-Policy $security_referrer_policy always;',
  'add_header Cross-Origin-Opener-Policy $security_coop always;',
  'add_header Content-Security-Policy $security_csp always;',
] as const;

const nginxQuoted = (value: string): string =>
  `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

const serializeApiContractLocation = ({
  path,
  mediaType,
  cacheControl,
  link,
}: PrerenderedApiContract): string =>
  [
    `location = ${path} {`,
    '    charset utf-8;',
    `    charset_types ${mediaType};`,
    '    types {',
    '    }',
    `    default_type ${mediaType};`,
    ...SECURITY_HEADERS.map((header) => `    ${header}`),
    `    add_header Cache-Control ${nginxQuoted(cacheControl)} always;`,
    `    add_header Link ${nginxQuoted(link)} always;`,
    '    try_files $uri =404;',
    '}',
  ].join('\n');

export const serializeApiContractHeaders = (
  contracts: readonly PrerenderedApiContract[],
): string =>
  [
    '# Generated from the public surface registry. Do not edit.',
    ...contracts.map(serializeApiContractLocation),
    '',
  ].join('\n');

const validateContracts = (
  contracts: readonly PrerenderedApiContract[],
): void => {
  const owners = new Set(contracts.map(({ ownerId }) => ownerId));
  const paths = new Set(contracts.map(({ path }) => path));

  if (
    owners.size !== EXPECTED_OWNERS.length ||
    !EXPECTED_OWNERS.every((owner) => owners.has(owner))
  ) {
    throw new Error('Prerendered API contracts must cover all five sections');
  }
  if (paths.size !== contracts.length) {
    throw new Error('Prerendered API contract paths must be unique');
  }

  for (const owner of EXPECTED_OWNERS) {
    const sectionContracts = contracts.filter(
      ({ ownerId }) => ownerId === owner,
    );
    const mediaTypes = new Set(
      sectionContracts.map(({ mediaType }) => mediaType),
    );

    if (
      sectionContracts.length !== EXPECTED_MEDIA_TYPES.length ||
      mediaTypes.size !== EXPECTED_MEDIA_TYPES.length ||
      !EXPECTED_MEDIA_TYPES.every((mediaType) => mediaTypes.has(mediaType))
    ) {
      throw new Error(
        `Prerendered API contracts for "${owner}" must contain JSON, Schema, and OpenAPI`,
      );
    }
  }
};

export const writeApiContractHeaders = async (
  dir: URL,
  site: URL,
): Promise<void> => {
  const contracts = collectPrerenderedApiContracts(
    publicSurfaceRegistry.slices,
    site.toString(),
  );
  validateContracts(contracts);

  await Promise.all(
    contracts.map(({ path }) => access(new URL(path.replace(/^\//, ''), dir))),
  );
  await writeFile(
    new URL('../api-contract-headers.conf', dir),
    serializeApiContractHeaders(contracts),
    'utf8',
  );
};

export const apiContractHeaders = (site: URL): AstroIntegration => ({
  name: 'api-contract-headers',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      await writeApiContractHeaders(dir, site);
    },
  },
});

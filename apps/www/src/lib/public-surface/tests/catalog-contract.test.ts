import { describe, expect, it } from 'vitest';

import { expectExactSectionCatalogMatchesRegistry } from '../catalog-contract.test-helper';
import type { PublicSurfaceSlice } from '../types';

const SITE_ROOT = 'https://example.com';

const slice = {
  owner: {
    id: 'example',
    label: 'Example',
    entryPath: '/example/',
  },
  surfaces: [
    {
      id: 'example:index',
      label: 'Example',
      path: '/example/',
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['section-entry'],
      catalogRole: 'anchor',
    },
    {
      id: 'example:data',
      label: 'Example data',
      path: '/example/data.json',
      mediaType: 'application/json',
      cacheClass: 'data',
      discoveryRoles: ['data-feed'],
      catalogRole: 'item',
    },
  ],
} satisfies PublicSurfaceSlice;

const dataEntry = {
  href: `${SITE_ROOT}/example/data.json`,
  type: 'application/json',
};

const catalogWith =
  (
    items: readonly Record<string, string>[] = [dataEntry],
    serviceDescriptions: readonly Record<string, string>[] = [],
  ) =>
  (): Record<string, unknown> => ({
    linkset: [
      {
        anchor: `${SITE_ROOT}/example/`,
        item: items,
        'service-desc': serviceDescriptions,
      },
    ],
  });

describe('exact section catalog contract', () => {
  it('accepts an exact match', () => {
    expect(() =>
      expectExactSectionCatalogMatchesRegistry({
        catalog: catalogWith(),
        siteRoot: SITE_ROOT,
        slice,
      }),
    ).not.toThrow();
  });

  it.each([
    ['a missing URL', catalogWith([])],
    [
      'an extra URL',
      catalogWith([
        dataEntry,
        {
          href: `${SITE_ROOT}/example/obsolete.json`,
          type: 'application/json',
        },
      ]),
    ],
    [
      'an incorrect MIME type',
      catalogWith([{ ...dataEntry, type: 'text/plain' }]),
    ],
    ['an incorrect role', catalogWith([], [dataEntry])],
  ])('rejects %s', (_case, catalog) => {
    expect(() =>
      expectExactSectionCatalogMatchesRegistry({
        catalog,
        siteRoot: SITE_ROOT,
        slice,
      }),
    ).toThrowError();
  });
});

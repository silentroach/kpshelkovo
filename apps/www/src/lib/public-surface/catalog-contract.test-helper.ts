import { expect } from 'vitest';

import {
  surfaceHref,
  type PublicSurface,
  type PublicSurfaceCatalogRole,
  type PublicSurfaceSlice,
} from './index';

type CatalogEntry = {
  readonly href?: string;
  readonly type?: string;
};

type CatalogLinkset = {
  readonly anchor?: string;
  readonly item?: readonly CatalogEntry[];
  readonly 'service-desc'?: readonly CatalogEntry[];
};

type AssertSectionCatalogInput = {
  readonly catalog: (root: string) => Record<string, unknown>;
  readonly catalogRoot?: string;
  readonly exact?: boolean;
  readonly siteRoot: string;
  readonly slice: PublicSurfaceSlice;
};

const linksets = (
  catalog: Record<string, unknown>,
): readonly CatalogLinkset[] =>
  Array.isArray(catalog.linkset) ? (catalog.linkset as CatalogLinkset[]) : [];

const contractEntry = (
  role: PublicSurfaceCatalogRole,
  href?: string,
  type?: string,
): string => `${role}\t${href ?? '<missing href>'}\t${type ?? '<no type>'}`;

const contractEntries = (catalog: Record<string, unknown>): readonly string[] =>
  linksets(catalog).flatMap((linkset) =>
    (['anchor', 'item', 'service-desc'] as const).flatMap((role) => {
      if (role === 'anchor') {
        return linkset.anchor ? [contractEntry(role, linkset.anchor)] : [];
      }

      return (linkset[role] ?? []).map((entry) =>
        contractEntry(role, entry.href, entry.type),
      );
    }),
  );

const sorted = (entries: readonly string[]): readonly string[] =>
  [...entries].sort();

const sectionCatalogRole = (
  surface: PublicSurface,
): PublicSurfaceCatalogRole | false | undefined =>
  surface.sectionCatalogRole ?? surface.catalogRole;

export const expectSectionCatalogMatchesRegistry = ({
  catalog,
  catalogRoot,
  exact = false,
  siteRoot,
  slice,
}: AssertSectionCatalogInput): void => {
  const body = catalog(catalogRoot ?? siteRoot);
  const actual = sorted(contractEntries(body));
  const expected = sorted(
    slice.surfaces.flatMap((surface) => {
      const role = sectionCatalogRole(surface);
      if (!role) {
        return [];
      }

      return [
        contractEntry(
          role,
          surfaceHref(siteRoot, surface),
          role === 'anchor' ? undefined : surface.mediaType,
        ),
      ];
    }),
  );

  const expectation = expect(
    actual,
    `${slice.owner.id} catalog role/URL/MIME contract`,
  );
  if (exact) {
    expectation.toEqual(expected);
    return;
  }

  expectation.toEqual(expect.arrayContaining([...expected]));
};

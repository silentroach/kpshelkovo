import type {
  PublicSurface,
  PublicSurfaceId,
  PublicSurfaceLinksetItem,
  PublicSurfaceOwner,
  PublicSurfaceOwnerId,
  PublicSurfaceRegistry,
  PublicSurfaceSlice,
} from './types';
import { comparePublicSurfaceSlice } from '@/compare/lib/public-surface';
import { contactsPublicSurfaceSlice } from '@/lib/contacts/public-surface';
import { discomfortPublicSurfaceSlice } from '@/lib/discomfort/public-surface';
import { kbPublicSurfaceSlice } from '@/lib/kb/public-surface';
import { meetingsPublicSurfaceSlice } from '@/lib/meetings/public-surface';
import { newsPublicSurfaceSlice } from '@/lib/news/public-surface';
import { peoplePublicSurfaceSlice } from '@/lib/people/public-surface';
import { placesPublicSurfaceSlice } from '@/lib/places/public-surface';
import { reglamentPublicSurfaceSlice } from '@/lib/reglament/public-surface';
import { reviewsPublicSurfaceSlice } from '@/lib/reviews/public-surface';
import { rootPublicSurfaceSlice } from '@/lib/root-public-surface';
import { statusPublicSurfaceSlice } from '@/lib/status/public-surface';

const absoluteUrl = (root: string, path: string): string =>
  new URL(path.replace(/^\//, ''), `${root.replace(/\/$/, '')}/`).toString();

export const surfaceHref = (root: string, surface: PublicSurface): string =>
  surface.path === undefined
    ? surface.routePattern
    : absoluteUrl(root, surface.path);

export const surfaceToLinksetItem = (
  root: string,
  surface: PublicSurface,
): PublicSurfaceLinksetItem => ({
  href: surfaceHref(root, surface),
  type: surface.mediaType,
  ...(surface.linkRelations?.length
    ? { rel: surface.linkRelations.map((link) => link.rel) }
    : {}),
  ...(surface.label ? { title: surface.label } : {}),
});

const assertUniqueRegistryIds = (
  slices: readonly PublicSurfaceSlice[],
): void => {
  const ownerIds = new Set<PublicSurfaceOwnerId>();

  for (const slice of slices) {
    if (ownerIds.has(slice.owner.id)) {
      throw new Error(`duplicate public surface owner id "${slice.owner.id}"`);
    }
    ownerIds.add(slice.owner.id);
  }

  const surfaceIds = new Set<PublicSurfaceId>();

  for (const slice of slices) {
    for (const surface of slice.surfaces) {
      if (surfaceIds.has(surface.id)) {
        throw new Error(`duplicate public surface id "${surface.id}"`);
      }
      surfaceIds.add(surface.id);
    }
  }
};

export const createPublicSurfaceRegistry = (
  slices: readonly PublicSurfaceSlice[],
): PublicSurfaceRegistry => {
  assertUniqueRegistryIds(slices);

  const sections = slices.map((slice) => slice.owner);
  const surfaces = slices.flatMap((slice) => slice.surfaces);
  const ownerBySurfaceId = new Map<PublicSurfaceId, PublicSurfaceOwner>(
    slices.flatMap((slice) =>
      slice.surfaces.map((surface) => [surface.id, slice.owner] as const),
    ),
  );
  const surfacesByOwnerId = new Map<
    PublicSurfaceOwnerId,
    readonly PublicSurface[]
  >(slices.map((slice) => [slice.owner.id, slice.surfaces] as const));

  return {
    sections,
    surfaces,
    slices,
    surfaceOwner: (surfaceId) => ownerBySurfaceId.get(surfaceId),
    surfacesByOwner: (ownerId) => surfacesByOwnerId.get(ownerId) ?? [],
  };
};

export const publicSurfaceRegistry = createPublicSurfaceRegistry([
  rootPublicSurfaceSlice,
  contactsPublicSurfaceSlice,
  kbPublicSurfaceSlice,
  newsPublicSurfaceSlice,
  statusPublicSurfaceSlice,
  meetingsPublicSurfaceSlice,
  peoplePublicSurfaceSlice,
  placesPublicSurfaceSlice,
  reviewsPublicSurfaceSlice,
  discomfortPublicSurfaceSlice,
  reglamentPublicSurfaceSlice,
  comparePublicSurfaceSlice,
]);

export { comparePublicSurfaceSlice } from '@/compare/lib/public-surface';
export { contactsPublicSurfaceSlice } from '@/lib/contacts/public-surface';
export { discomfortPublicSurfaceSlice } from '@/lib/discomfort/public-surface';
export { kbPublicSurfaceSlice } from '@/lib/kb/public-surface';
export { meetingsPublicSurfaceSlice } from '@/lib/meetings/public-surface';
export { newsPublicSurfaceSlice } from '@/lib/news/public-surface';
export { peoplePublicSurfaceSlice } from '@/lib/people/public-surface';
export { placesPublicSurfaceSlice } from '@/lib/places/public-surface';
export { reglamentPublicSurfaceSlice } from '@/lib/reglament/public-surface';
export { reviewsPublicSurfaceSlice } from '@/lib/reviews/public-surface';
export { rootPublicSurfaceSlice } from '@/lib/root-public-surface';
export { statusPublicSurfaceSlice } from '@/lib/status/public-surface';

export type {
  PublicSurface,
  PublicSurfaceAcceptNegotiation,
  PublicSurfaceCacheClass,
  PublicSurfaceCatalogRole,
  PublicSurfaceDiscoveryRole,
  PublicSurfaceId,
  PublicSurfaceLinkRelation,
  PublicSurfaceLinksetItem,
  PublicSurfaceOwner,
  PublicSurfaceOwnerId,
  PublicSurfaceRegistry,
  PublicSurfaceSlice,
} from './types';

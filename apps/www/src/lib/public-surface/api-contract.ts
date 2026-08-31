import type { PrerenderedApiContract } from './api-contract.types';
import type {
  PublicSurface,
  PublicSurfaceCatalogRole,
  PublicSurfaceSlice,
} from './types';

const LINKSET_PROFILE = 'https://www.rfc-editor.org/info/rfc9727';
const CONTRACT_CACHE_CONTROL = 'public,max-age=3600,stale-while-revalidate=600';

const contractCacheControl = (
  ownerId: string,
  surface: PublicSurface,
): string => {
  if (surface.cacheClass !== 'data') {
    return CONTRACT_CACHE_CONTROL;
  }
  if (ownerId === 'compare') {
    return 'public,max-age=300,stale-while-revalidate=300';
  }
  if (ownerId === 'status') {
    return 'public,max-age=60,stale-while-revalidate=300';
  }

  return CONTRACT_CACHE_CONTROL;
};

const absoluteUrl = (root: string, path: string): string =>
  new URL(path.replace(/^\//, ''), `${root.replace(/\/$/, '')}/`).toString();

const sectionCatalogRole = (
  surface: PublicSurface,
): PublicSurfaceCatalogRole | false | undefined =>
  surface.sectionCatalogRole ?? surface.catalogRole;

const surfacePath = (surface: PublicSurface): string => {
  if (!surface.path) {
    throw new Error(`API contract surface "${surface.id}" must have a path`);
  }

  return surface.path;
};

export const apiContractLinkHeader = (
  slice: PublicSurfaceSlice,
  root: string,
): string => {
  const serviceDescriptions = slice.surfaces
    .filter((surface) => sectionCatalogRole(surface) === 'service-desc')
    .map(
      (surface) =>
        `<${absoluteUrl(root, surfacePath(surface))}>; rel="service-desc"; type="${surface.mediaType}"`,
    );
  const catalog = slice.surfaces.find((surface) =>
    surface.discoveryRoles.includes('api-catalog'),
  );

  if (!catalog) {
    throw new Error(`API contract owner "${slice.owner.id}" has no catalog`);
  }

  return [
    ...serviceDescriptions,
    `<${absoluteUrl(root, surfacePath(catalog))}>; rel="api-catalog"; type="${catalog.mediaType}"; profile="${LINKSET_PROFILE}"`,
  ].join(', ');
};

export const apiContractResponseHeaders = (
  slice: PublicSurfaceSlice,
  surfaceId: string,
  root: string,
): Readonly<Record<string, string>> => {
  const surface = slice.surfaces.find(({ id }) => id === surfaceId);

  if (!surface?.prerenderedApiContract) {
    throw new Error(`Unknown prerendered API contract surface "${surfaceId}"`);
  }

  return {
    'Content-Type': `${surface.mediaType}; charset=utf-8`,
    Link: apiContractLinkHeader(slice, root),
  };
};

export const collectPrerenderedApiContracts = (
  slices: readonly PublicSurfaceSlice[],
  root: string,
): readonly PrerenderedApiContract[] =>
  slices.flatMap((slice) => {
    const surfaces = slice.surfaces.filter(
      ({ prerenderedApiContract }) => prerenderedApiContract,
    );

    if (surfaces.length === 0) {
      return [];
    }

    const link = apiContractLinkHeader(slice, root);

    return surfaces.map((surface) => ({
      id: surface.id,
      ownerId: slice.owner.id,
      path: surfacePath(surface),
      mediaType: surface.mediaType,
      cacheControl: contractCacheControl(slice.owner.id, surface),
      link,
    }));
  });

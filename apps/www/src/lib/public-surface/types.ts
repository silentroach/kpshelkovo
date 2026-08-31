export type PublicSurfaceOwnerId = string;

export type PublicSurfaceId = string;

export type PublicSurfaceDiscoveryRole =
  | 'api-catalog'
  | 'data-feed'
  | 'detail-page'
  | 'download'
  | 'llms'
  | 'markdown-companion'
  | 'root-catalog'
  | 'schema'
  | 'section-entry'
  | 'skill-index';

export type PublicSurfaceCatalogRole = 'anchor' | 'item' | 'service-desc';

export type PublicSurfaceCacheClass =
  | 'catalog'
  | 'data'
  | 'feed'
  | 'html'
  | 'markdown'
  | 'schema'
  | 'static'
  | 'uncached';

export type PublicSurfaceAcceptNegotiation =
  'not-negotiated' | 'optional' | 'required';

export interface PublicSurfaceOwner {
  readonly id: PublicSurfaceOwnerId;
  readonly label: string;
  readonly entryPath?: string;
}

export interface PublicSurfaceLinkRelation {
  readonly rel: string;
  readonly href: string;
  readonly mediaType?: string;
}

interface PublicSurfaceBase {
  readonly id: PublicSurfaceId;
  readonly label: string;
  readonly mediaType: string;
  readonly cacheClass: PublicSurfaceCacheClass;
  readonly discoveryRoles: readonly PublicSurfaceDiscoveryRole[];
  readonly catalogRole?: PublicSurfaceCatalogRole;
  readonly sectionCatalogRole?: PublicSurfaceCatalogRole | false;
  readonly prerenderedApiContract?: true;
  readonly linkRelations?: readonly PublicSurfaceLinkRelation[];
  readonly acceptsNegotiation?: PublicSurfaceAcceptNegotiation;
}

export interface PublicSurfacePath extends PublicSurfaceBase {
  readonly path: string;
  readonly routePattern?: never;
}

export interface PublicSurfaceRoutePattern extends PublicSurfaceBase {
  readonly path?: never;
  readonly routePattern: string;
}

export type PublicSurface = PublicSurfacePath | PublicSurfaceRoutePattern;

export interface PublicSurfaceSlice {
  readonly owner: PublicSurfaceOwner;
  readonly surfaces: readonly PublicSurface[];
}

export interface PublicSurfaceRegistry {
  readonly sections: readonly PublicSurfaceOwner[];
  readonly surfaces: readonly PublicSurface[];
  readonly slices: readonly PublicSurfaceSlice[];
  readonly surfaceOwner: (
    surfaceId: PublicSurfaceId,
  ) => PublicSurfaceOwner | undefined;
  readonly surfacesByOwner: (
    ownerId: PublicSurfaceOwnerId,
  ) => readonly PublicSurface[];
}

export interface PublicSurfaceLinksetItem {
  readonly href: string;
  readonly type: string;
  readonly rel?: readonly string[];
  readonly title?: string;
}

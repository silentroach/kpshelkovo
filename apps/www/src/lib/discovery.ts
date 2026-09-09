import { formatApiCatalogLink } from './api-catalog-response';
import { siteApiCatalogUrl } from './llms';
import { publicSurfaceRegistry, surfaceHref, type PublicSurface } from './public-surface';

const full = (root: string, path: string): string => new URL(path, `${root}/`).toString();

const star = (value: string): readonly { readonly value: string; readonly language: 'ru' }[] => [
  { value, language: 'ru' }
];

const item = (
  root: string,
  surface: PublicSurface
): {
  readonly href: string;
  readonly type: string;
  readonly 'title*': readonly {
    readonly value: string;
    readonly language: 'ru';
  }[];
} => ({
  href: surfaceHref(root, surface),
  type: surface.mediaType,
  'title*': star(surface.label)
});

const hasCatalogLinks = (entry: {
  readonly anchor?: string;
  readonly item?: readonly unknown[];
  readonly 'service-desc'?: readonly unknown[];
}): boolean => Boolean(entry.anchor || entry.item?.length || entry['service-desc']?.length);

export function catalog(root: string): Record<string, unknown> {
  return {
    linkset: publicSurfaceRegistry.slices
      .map((slice) => {
        const anchor = slice.surfaces.find((surface) => surface.catalogRole === 'anchor');
        const items = slice.surfaces
          .filter((surface) => surface.catalogRole === 'item')
          .map((surface) => item(root, surface));
        const serviceDesc = slice.surfaces
          .filter((surface) => surface.catalogRole === 'service-desc')
          .map((surface) => item(root, surface));

        return {
          ...(anchor ? { anchor: surfaceHref(root, anchor) } : {}),
          ...(items.length ? { item: items } : {}),
          ...(serviceDesc.length ? { 'service-desc': serviceDesc } : {})
        };
      })
      .filter(hasCatalogLinks)
  };
}

export const self = (root: string): string => formatApiCatalogLink(full(root, siteApiCatalogUrl()));

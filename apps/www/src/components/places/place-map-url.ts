import { PARCEL_PARTS, type ParcelPart } from '@/lib/parcels/schema';
import { PLACE_MAP_LAYERS, type PlaceMapLayer } from '@/lib/places/schema';

export const PLACE_HIGHLIGHT_QUERY_PARAM = 'h';
export const SELECTION_SET_QUERY_PARAM = 'set';

export const getInitialMapLayers = (
  params: URLSearchParams
): readonly (ParcelPart | PlaceMapLayer)[] => {
  const requested = new Set(params.getAll('l').flatMap((value) => value.split(',')));
  return [
    ...PARCEL_PARTS.filter((part) => requested.has('parcels') || requested.has(part)),
    ...PLACE_MAP_LAYERS.filter((layer) => requested.has(layer))
  ];
};

export const getUrlWithoutSelectionSet = (href: string): string => {
  const url = new URL(href);
  const query = url.search
    .slice(1)
    .split('&')
    .filter((part) => {
      const name = part.split('=')[0]!;
      try {
        return decodeURIComponent(name.replaceAll('+', ' ')) !== SELECTION_SET_QUERY_PARAM;
      } catch {
        return true;
      }
    })
    .join('&');
  url.search = query ? `?${query}` : '';
  return `${url.pathname}${url.search}${url.hash}`;
};

export const getUrlWithoutPlaceHighlight = (
  href: string,
  expectedSlug?: string
): string | undefined => {
  const url = new URL(href);

  if (!url.searchParams.has(PLACE_HIGHLIGHT_QUERY_PARAM)) return;

  const currentSlug = url.searchParams.get(PLACE_HIGHLIGHT_QUERY_PARAM) || undefined;

  if (currentSlug !== expectedSlug) return;

  const query = url.search
    .slice(1)
    .split('&')
    .filter((part) => {
      const separator = part.indexOf('=');
      const encodedName = separator === -1 ? part : part.slice(0, separator);

      try {
        return decodeURIComponent(encodedName.replaceAll('+', ' ')) !== PLACE_HIGHLIGHT_QUERY_PARAM;
      } catch {
        return true;
      }
    })
    .join('&');

  url.search = query ? `?${query}` : '';
  return `${url.pathname}${url.search}${url.hash}`;
};

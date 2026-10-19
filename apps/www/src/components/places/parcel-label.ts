import type { ParcelLabelItem } from './parcel-label.types';

export const PARCEL_LABEL_MIN_ZOOM = 17;

export const getParcelLabelCodes = (item: ParcelLabelItem): readonly string[] =>
  item.multipleCadastralParcels && item.aliases?.length
    ? [
        item.code,
        ...item.aliases.toSorted((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      ]
    : [item.code];

export const formatParcelLabel = (item: ParcelLabelItem): string =>
  getParcelLabelCodes(item)
    .map((code) => code.split('-')[1] ?? code)
    .join('/');

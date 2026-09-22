import { withBase } from '@/lib/site';

export const parcelMapDataPath = (): string => '/map/data/parcels.json';
export const parcelSearchDataPath = (): string => '/map/data/parcel-search.json';
export const parcelMapDataUrl = (): string => withBase(parcelMapDataPath());
export const parcelSearchDataUrl = (): string => withBase(parcelSearchDataPath());

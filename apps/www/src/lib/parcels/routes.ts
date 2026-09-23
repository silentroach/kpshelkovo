import { withBase } from '@/lib/site';

export const parcelMapDataPath = (): string => '/map/data/parcels.json';
export const parcelMapDataUrl = (): string => withBase(parcelMapDataPath());

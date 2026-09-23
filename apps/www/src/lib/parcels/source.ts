import { PARCEL_CODE } from './schema.ts';

export const parcelRecordPath = (code: string): string => {
  if (!PARCEL_CODE.test(code)) throw new Error(`invalid parcel code "${code}"`);
  const [part, number] = code.toLowerCase().split('-');
  return `${part}/${number?.[0]}/${number}.md`;
};

export const parcelSourceId = (entry: string): string => {
  const match = /^(shr|shf|shp|shv)\/[a-z]\/([a-z]+[0-9]+)\.md$/.exec(entry);
  if (!match || entry !== parcelRecordPath(`${match[1]?.toUpperCase()}-${match[2]?.toUpperCase()}`))
    throw new Error(`invalid parcel path "${entry}"`);
  return entry.slice(0, -3);
};

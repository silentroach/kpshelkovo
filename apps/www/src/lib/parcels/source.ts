export const parcelSourceId = (entry: string): string => {
  if (!/^(?:shr|shf|shp|shv)\/[a-z]+[0-9]+\.md$/.test(entry)) {
    throw new Error(`parcel path "${entry}" must be <part>/<lower-case-number>.md`);
  }

  return entry.slice(0, -3);
};

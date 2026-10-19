export interface ResolvedMapSelectionSet {
  readonly id: string;
  readonly parcelCodes: readonly string[];
  readonly placeSlugs: readonly string[];
  readonly outline: boolean;
}

export interface MapSelectionSet extends ResolvedMapSelectionSet {
  readonly setIds: readonly string[];
}

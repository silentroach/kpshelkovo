/** Compact static payload consumed by the map client. */
export interface MapSelectionSetPublicDto {
  readonly id: string;
  readonly parcels: readonly string[];
  readonly places: readonly string[];
  readonly outline: boolean;
}

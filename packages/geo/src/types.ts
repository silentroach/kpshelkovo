export type Coordinates = {
  readonly lat: number;
  readonly lng: number;
};

export type CivilTwilight = {
  readonly dawn: Date;
  readonly dusk: Date;
};

export type PolygonPosition = readonly [number, number];
export type PolygonCoordinates = readonly (readonly PolygonPosition[])[];
export type PolygonGeometry =
  | { readonly type: 'Polygon'; readonly coordinates: PolygonCoordinates }
  | { readonly type: 'MultiPolygon'; readonly coordinates: readonly PolygonCoordinates[] };

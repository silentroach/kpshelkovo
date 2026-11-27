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

export type PlanarEdge = {
  readonly start: PolygonPosition;
  readonly end: PolygonPosition;
  readonly dx: number;
  readonly dy: number;
  readonly length: number;
};

export type LineFragment = {
  readonly inside: boolean;
  readonly line: readonly PolygonPosition[];
};

export type ActiveLineFragment = {
  readonly inside: boolean;
  readonly line: PolygonPosition[];
};

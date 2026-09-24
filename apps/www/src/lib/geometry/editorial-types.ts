export type EditorialPosition = readonly [lng: number, lat: number];
export type EditorialPolygonCoordinates = readonly (readonly EditorialPosition[])[];

export type EditorialGeometry =
  | { readonly type: 'Point'; readonly coordinates: EditorialPosition }
  | { readonly type: 'LineString'; readonly coordinates: readonly EditorialPosition[] }
  | { readonly type: 'Polygon'; readonly coordinates: EditorialPolygonCoordinates }
  | { readonly type: 'MultiPolygon'; readonly coordinates: readonly EditorialPolygonCoordinates[] };

export type EditorialPolygonGeometry = Extract<
  EditorialGeometry,
  { readonly type: 'Polygon' | 'MultiPolygon' }
>;

export interface EditorialFeature {
  readonly type: 'Feature';
  readonly id?: number | string;
  readonly geometry: EditorialGeometry;
  readonly description?: string;
  readonly iconCaption?: string;
  readonly iconContent?: string;
  readonly markerColor?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly strokeOpacity?: number;
  /** Alternating dash and gap lengths; absent means a solid stroke. */
  readonly strokeDasharray?: readonly number[];
  readonly fill?: string;
  readonly fillOpacity?: number;
  /** Editorial uncertainty, independent of stroke and dash style. */
  readonly precision?: 'approximate';
}

export interface EditorialFeatureCollection {
  readonly type: 'FeatureCollection';
  readonly metadata?: {
    readonly name?: string;
    readonly description?: string;
    readonly creator?: string;
  };
  readonly features: readonly EditorialFeature[];
}

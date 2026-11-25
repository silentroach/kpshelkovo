export type RoadBounds = readonly [south: number, west: number, north: number, east: number];

export type RoadNode = {
  readonly id: number;
  readonly lat: number;
  readonly lon: number;
  readonly tags?: Readonly<Record<string, string>>;
};

export type RoadWay = {
  readonly id: number;
  readonly nodes: readonly number[];
  readonly tags: Readonly<Record<string, string>>;
};

export type RoadSnapshot = {
  readonly source: string;
  readonly license: string;
  readonly endpoint: string;
  readonly capturedAt: string;
  readonly osmTimestamp: string;
  readonly bounds: RoadBounds;
  readonly nodes: readonly RoadNode[];
  readonly ways: readonly RoadWay[];
};

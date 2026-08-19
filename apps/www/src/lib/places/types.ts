export interface PlaceCoordinates {
  readonly lat: number;
  readonly lng: number;
}

export interface Place {
  readonly slug: string;
  readonly name: string;
  readonly summary: string;
  readonly address: string;
  readonly coordinates: PlaceCoordinates;
  readonly mapUrl: string;
  readonly contactUrl: string;
  readonly updatedIso: string;
  readonly url: string;
  readonly markdownUrl: string;
  readonly canonical: string;
}

export interface PlaceSourceContact {
  readonly slug: string;
  readonly title: string;
  readonly summary?: string;
  readonly updatedIso: string;
  readonly hasDetailPage: boolean;
  readonly url?: string;
  readonly location?: {
    readonly url: string;
    readonly address?: string;
    readonly coordinates?: PlaceCoordinates;
  };
}

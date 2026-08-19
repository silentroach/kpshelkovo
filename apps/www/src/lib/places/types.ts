import type { CollectionEntry } from 'astro:content';

import type { PreprocessedSiteMarkdownBody } from '@/lib/markdown/render';
import type { EntityMentionTarget } from '@/lib/mentions';

import type { RawPlace } from './raw-schema';
import type { PlaceCategory, PlaceStatus } from './schema';

export type PlaceEntry = Pick<CollectionEntry<'places'>, 'id' | 'body'> & {
  readonly data: RawPlace;
};

export interface PlaceCoordinates {
  readonly lat: number;
  readonly lng: number;
}

export interface PlaceContact {
  readonly id: string;
  readonly url: string;
}

export interface PlaceEvidence {
  readonly sourceUrl: string;
  readonly checkedAt: Date;
  readonly checkedIso: string;
}

export interface Place {
  readonly slug: string;
  readonly name: string;
  readonly category: PlaceCategory;
  readonly status: PlaceStatus;
  readonly summary: string;
  readonly body: PreprocessedSiteMarkdownBody;
  readonly mentions: readonly EntityMentionTarget[];
  readonly address: string;
  readonly coordinates: PlaceCoordinates;
  readonly mapUrl: string;
  readonly contact?: PlaceContact;
  readonly evidence?: PlaceEvidence;
  readonly updatedAt: Date;
  readonly updatedIso: string;
  readonly url: string;
  readonly markdownUrl: string;
  readonly canonical: string;
}

export interface PlacesDataset {
  readonly places: readonly Place[];
  readonly bySlug: ReadonlyMap<string, Place>;
}

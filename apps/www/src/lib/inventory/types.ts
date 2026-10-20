import type { ContactMethods } from '@/lib/contact-methods/types';
import type { PreprocessedSiteMarkdownBody } from '@/lib/markdown/render';
import type { EntityMentionTarget, SiteMentionRegistry } from '@/lib/mentions';
import type { Parcel } from '@/lib/parcels/types';

import type { InventoryGroupId } from './groups';

export interface InventoryLinks {
  readonly url: string;
  readonly markdownUrl: string;
  readonly canonical: string;
}

export interface InventoryOwner {
  readonly id: string;
  readonly name: string;
  readonly contacts: ContactMethods;
  readonly parcel: { readonly code: string; readonly url: string };
}

export type InventoryPrice =
  | { readonly type: 'fixed'; readonly value: number; readonly period: 'hour' | 'day' | 'once' }
  | { readonly type: 'free' }
  | { readonly type: 'negotiable' };

export interface InventoryPhoto {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly caption?: string;
}

export interface InventoryBody {
  readonly body: PreprocessedSiteMarkdownBody;
  readonly mentions: readonly EntityMentionTarget[];
  /** Stable namespace shared by HTML rendering and the Markdown companion. */
  readonly bodyIdPrefix: string;
}

export interface InventoryOffer extends InventoryBody, InventoryLinks {
  readonly id: string;
  readonly title: string;
  /** Manually edited plain text for compact cards, independent of body. */
  readonly summary: string;
  readonly kindId: string;
  readonly owner: InventoryOwner;
  readonly price: InventoryPrice;
  readonly photos: readonly InventoryPhoto[];
  readonly anchorId: string;
  /** Link to this offer's compact card on the kind page. */
  readonly listingUrl: string;
}

export interface InventoryKind extends InventoryBody, InventoryLinks {
  readonly id: string;
  readonly title: string;
  readonly group: InventoryGroupId;
  readonly offers: readonly InventoryOffer[];
}

export interface InventoryGroup extends InventoryLinks {
  readonly id: InventoryGroupId;
  readonly title: string;
  /** Only kinds with current offers; all declared kinds remain in dataset.kinds. */
  readonly kinds: readonly InventoryKind[];
}

export interface InventoryDataset {
  /** All three groups, including empty ones. */
  readonly groups: readonly InventoryGroup[];
  readonly kinds: readonly InventoryKind[];
  readonly owners: readonly InventoryOwner[];
  readonly offers: readonly InventoryOffer[];
  readonly byGroup: ReadonlyMap<InventoryGroupId, InventoryGroup>;
  readonly byKind: ReadonlyMap<string, InventoryKind>;
}

export interface InventoryBuildOptions {
  readonly parcels: ReadonlyMap<string, Pick<Parcel, 'code'>>;
  readonly mentionRegistry?: SiteMentionRegistry;
}

export interface InventoryGroupRouteInput {
  readonly group: string;
}
export interface InventoryKindRouteInput extends InventoryGroupRouteInput {
  readonly id: string;
}
export interface InventoryOfferRouteInput extends InventoryKindRouteInput {
  readonly offerId: string;
}

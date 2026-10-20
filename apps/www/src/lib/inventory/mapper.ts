import { mapRawContactMethods } from '@/lib/contact-methods/mapper';
import { preprocessSiteMarkdownContent } from '@/lib/markdown/render';
import type { SiteMentionRegistry } from '@/lib/mentions';
import { getUrlWithParcel } from '@/lib/parcels/parcel-url';
import { canon, withBase } from '@/lib/site';

import type { RawInventoryOffer } from './raw-schema';
import {
  inventoryKindCanonical,
  inventoryKindMarkdownUrl,
  inventoryKindUrl,
  inventoryOfferAnchor,
  inventoryOfferCanonical,
  inventoryOfferMarkdownUrl,
  inventoryOfferUrl
} from './routes';
import type { InventoryKindEntry, InventoryOfferEntry, InventoryOwnerEntry } from './source-types';
import type {
  InventoryBody,
  InventoryKind,
  InventoryOffer,
  InventoryOwner,
  InventoryPrice
} from './types';

const mapBody = (
  entry: { readonly id: string; readonly body?: string },
  type: 'kind' | 'offer',
  registry: SiteMentionRegistry
): InventoryBody => {
  const body = preprocessSiteMarkdownContent(
    entry.body ?? '',
    `inventory ${type} "${type === 'kind' ? 'kinds' : 'offers'}/${entry.id}.md" body`,
    registry
  );
  return {
    body: body.markdown,
    mentions: body.mentions,
    bodyIdPrefix: `${type}-${entry.id}-body-`
  };
};

export const mapRawInventoryOwner = (
  entry: InventoryOwnerEntry,
  parcelCode: string
): InventoryOwner => ({
  id: entry.id,
  name: entry.data.name,
  contacts: mapRawContactMethods(entry.data.contacts),
  parcel: { code: parcelCode, url: withBase(getUrlWithParcel(canon('/map/'), parcelCode)) }
});

export const mapRawInventoryPrice = (price: RawInventoryOffer['price']): InventoryPrice => {
  if (price === undefined) return { type: 'negotiable' };
  if (price === 0) return { type: 'free' };
  return { type: 'fixed', value: price.value, period: price.period };
};

export const mapRawInventoryKind = (
  entry: InventoryKindEntry,
  offers: readonly InventoryOffer[],
  registry: SiteMentionRegistry
): InventoryKind => {
  const body = mapBody(entry, 'kind', registry);
  const route = { group: entry.data.group, id: entry.id };
  return {
    id: entry.id,
    title: entry.data.title,
    group: entry.data.group,
    offers,
    body: body.body,
    mentions: body.mentions,
    bodyIdPrefix: body.bodyIdPrefix,
    url: inventoryKindUrl(route),
    markdownUrl: inventoryKindMarkdownUrl(route),
    canonical: inventoryKindCanonical(route)
  };
};

export const mapRawInventoryOffer = (
  entry: InventoryOfferEntry,
  owner: InventoryOwner,
  kind: InventoryKindEntry,
  registry: SiteMentionRegistry
): InventoryOffer => {
  const body = mapBody(entry, 'offer', registry);
  const route = { group: kind.data.group, id: kind.id, offerId: entry.id };
  const anchorId = inventoryOfferAnchor(entry.id);
  return {
    id: entry.id,
    title: entry.data.title,
    summary: entry.data.summary,
    kindId: kind.id,
    owner,
    price: mapRawInventoryPrice(entry.data.price),
    photos:
      entry.data.photos?.map((photo) => ({
        url: photo.url,
        width: photo.width,
        height: photo.height,
        alt: photo.alt,
        caption: photo.caption
      })) ?? [],
    body: body.body,
    mentions: body.mentions,
    bodyIdPrefix: body.bodyIdPrefix,
    anchorId,
    listingUrl: `${inventoryKindUrl(route)}#${anchorId}`,
    url: inventoryOfferUrl(route),
    markdownUrl: inventoryOfferMarkdownUrl(route),
    canonical: inventoryOfferCanonical(route)
  };
};

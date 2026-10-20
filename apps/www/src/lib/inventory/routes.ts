import { canon, withBase } from '@/lib/site';

import { isInventoryGroup } from './groups';
import { isInventoryId } from './schema';
import type {
  InventoryGroupRouteInput,
  InventoryKindRouteInput,
  InventoryOfferRouteInput
} from './types';

export const inventoryPath = (): string => '/ukogo/';
export const inventoryMarkdownPath = (): string => '/ukogo/index.md';
export const inventoryUrl = (): string => withBase(inventoryPath());
export const inventoryMarkdownUrl = (): string => withBase(inventoryMarkdownPath());
export const inventoryCanonical = (): string => canon(inventoryPath());

export const inventoryGroupPath = ({ group }: InventoryGroupRouteInput): string => {
  if (!isInventoryGroup(group)) throw new Error(`inventory group "${group}" is invalid`);
  return `${inventoryPath()}${group}/`;
};

export const inventoryKindPath = (input: InventoryKindRouteInput): string => {
  if (!isInventoryId(input.id)) throw new Error(`inventory kind id "${input.id}" is invalid`);
  return `${inventoryGroupPath(input)}${input.id}/`;
};

export const inventoryOfferPath = (input: InventoryOfferRouteInput): string => {
  if (!isInventoryId(input.offerId))
    throw new Error(`inventory offer id "${input.offerId}" is invalid`);
  return `${inventoryKindPath(input)}${input.offerId}/`;
};

export const inventoryGroupMarkdownPath = (input: InventoryGroupRouteInput): string =>
  `${inventoryGroupPath(input)}index.md`;
export const inventoryKindMarkdownPath = (input: InventoryKindRouteInput): string =>
  `${inventoryKindPath(input)}index.md`;
export const inventoryOfferMarkdownPath = (input: InventoryOfferRouteInput): string =>
  `${inventoryOfferPath(input)}index.md`;
export const inventoryGroupUrl = (input: InventoryGroupRouteInput): string =>
  withBase(inventoryGroupPath(input));
export const inventoryGroupMarkdownUrl = (input: InventoryGroupRouteInput): string =>
  withBase(inventoryGroupMarkdownPath(input));
export const inventoryGroupCanonical = (input: InventoryGroupRouteInput): string =>
  canon(inventoryGroupPath(input));
export const inventoryKindUrl = (input: InventoryKindRouteInput): string =>
  withBase(inventoryKindPath(input));
export const inventoryKindMarkdownUrl = (input: InventoryKindRouteInput): string =>
  withBase(inventoryKindMarkdownPath(input));
export const inventoryKindCanonical = (input: InventoryKindRouteInput): string =>
  canon(inventoryKindPath(input));
export const inventoryOfferUrl = (input: InventoryOfferRouteInput): string =>
  withBase(inventoryOfferPath(input));
export const inventoryOfferMarkdownUrl = (input: InventoryOfferRouteInput): string =>
  withBase(inventoryOfferMarkdownPath(input));
export const inventoryOfferCanonical = (input: InventoryOfferRouteInput): string =>
  canon(inventoryOfferPath(input));
export const inventoryOfferAnchor = (id: string): string => {
  if (!isInventoryId(id)) throw new Error(`inventory offer id "${id}" is invalid`);
  return `offer-${id}`;
};

export const inventoryGroupPattern = (): string => '/ukogo/:group/';
export const inventoryGroupMarkdownPattern = (): string => '/ukogo/:group/index.md';
export const inventoryKindPattern = (): string => '/ukogo/:group/:kind/';
export const inventoryKindMarkdownPattern = (): string => '/ukogo/:group/:kind/index.md';
export const inventoryOfferPattern = (): string => '/ukogo/:group/:kind/:offer/';
export const inventoryOfferMarkdownPattern = (): string => '/ukogo/:group/:kind/:offer/index.md';

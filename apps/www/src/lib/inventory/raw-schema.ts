import { z } from 'astro/zod';

import { RawContactMethodsSchema } from '@/lib/contact-methods/raw-schema';

import { INVENTORY_GROUPS } from './groups';
import { INVENTORY_ID } from './schema';

const text = z.string().trim().min(1);
const reference = text.regex(INVENTORY_ID);
const segment = '[a-z0-9]+(?:-[a-z0-9]+)*';
const datedPhoto = new RegExp(
  `^/(?:news|reviews)/[0-9]{4}/(?:0[1-9]|1[0-2])/${segment}/${segment}\\.jpeg$`
);
const inventoryPhoto = new RegExp(`^/ukogo/${segment}/${segment}\\.jpeg$`);
const portrait = new RegExp(`^/people/${segment}\\.jpeg$`);
const kbImage = new RegExp(
  `^/kb/(?:${segment}/)+[0-9]{4}-[0-9]{2}-[0-9]{2}/${segment}\\.(?:png|jpeg)$`
);

const isPublishedPhotoUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      url.origin === 'https://media.kpshelkovo.online' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      value === `${url.origin}${url.pathname}` &&
      [datedPhoto, inventoryPhoto, portrait, kbImage].some((pattern) => pattern.test(url.pathname))
    );
  } catch {
    return false;
  }
};

export const RawInventoryPhotoSchema = z
  .object({
    url: text.refine(isPublishedPhotoUrl, {
      message:
        'photo must use a supported publication path on https://media.kpshelkovo.online without query or fragment'
    }),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    alt: text,
    caption: text.optional()
  })
  .strict();

export const RawInventoryOwnerSchema = z
  .object({
    name: text,
    parcel: text,
    contacts: RawContactMethodsSchema
  })
  .strict();

export const RawInventoryKindSchema = z
  .object({
    title: text,
    group: z.enum(INVENTORY_GROUPS)
  })
  .strict();

export const RawInventoryOfferSchema = z
  .object({
    title: text,
    summary: text,
    owner: reference,
    kind: reference,
    price: z
      .union([
        z.literal(0),
        z
          .object({
            value: z.number().min(0.01).multipleOf(0.01),
            period: z.enum(['hour', 'day', 'once'])
          })
          .strict()
      ])
      .optional(),
    photos: z.array(RawInventoryPhotoSchema).min(1).optional()
  })
  .strict();

export type RawInventoryOwner = z.output<typeof RawInventoryOwnerSchema>;
export type RawInventoryKind = z.output<typeof RawInventoryKindSchema>;
export type RawInventoryOffer = z.output<typeof RawInventoryOfferSchema>;

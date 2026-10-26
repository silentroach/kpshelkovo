import {
  RawInventoryKindSchema,
  RawInventoryOfferSchema,
  RawInventoryOwnerSchema
} from '../raw-schema';
import type { InventoryKindEntry, InventoryOfferEntry, InventoryOwnerEntry } from '../source-types';

export const ownerEntry = (id = 'anna', data?: Record<string, unknown>): InventoryOwnerEntry => ({
  id,
  data: RawInventoryOwnerSchema.parse({
    name: 'Анна',
    parcel: 'SHR-ALIAS',
    contacts: { telegram: 'https://t.me/example' },
    ...data
  })
});

export const kindEntry = (
  id = 'grinder',
  data?: Record<string, unknown>,
  body = '[Инструкция](/kb/tool/).'
): InventoryKindEntry => ({
  id,
  data: RawInventoryKindSchema.parse({ title: 'Болгарка', group: 'construction', ...data }),
  body
});

export const offerEntry = (
  id = 'grinder-a',
  data?: Record<string, unknown>,
  body = 'Диск 125 мм.'
): InventoryOfferEntry => ({
  id,
  data: RawInventoryOfferSchema.parse({
    title: 'Болгарка 125',
    summary: 'Диск 125 мм в комплекте.',
    owner: 'anna',
    kind: 'grinder',
    ...data
  }),
  body
});

export const parcels = new Map([
  ['SHR-ALIAS', { code: 'SHR-L43' }],
  ['SHR-L43', { code: 'SHR-L43' }]
]);

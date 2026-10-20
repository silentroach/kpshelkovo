import { buildInventoryDataset } from '../../load';
import {
  RawInventoryKindSchema,
  RawInventoryOfferSchema,
  RawInventoryOwnerSchema
} from '../../raw-schema';
import type { InventoryDataset } from '../../types';

const body = '### Комплект\n\n[К комплекту](#комплект). Условия[^1].\n\n[^1]: Вернуть чистым.';

export const inventoryPageFixture = (empty = false): InventoryDataset =>
  buildInventoryDataset(
    {
      owners: [
        {
          id: 'boris',
          data: RawInventoryOwnerSchema.parse({
            name: 'Борис',
            parcel: 'SHP-ALIAS',
            contacts: { phone: '89969670018', telegram: 'https://t.me/example_boris' }
          })
        },
        {
          id: 'anna',
          data: RawInventoryOwnerSchema.parse({
            name: 'Анна',
            parcel: 'SHP-A2',
            contacts: { email: 'anna@example.com' }
          })
        }
      ],
      kinds: [
        {
          id: 'drill',
          data: RawInventoryKindSchema.parse({ title: 'Дрели', group: 'construction' }),
          body: '## Выбор\n\n[Ручная инструкция](/kb/tools/drill/).\n\n[К выбору](#выбор).'
        },
        { id: 'saw', data: RawInventoryKindSchema.parse({ title: 'Пилы', group: 'construction' }) },
        {
          id: 'mower',
          data: RawInventoryKindSchema.parse({ title: 'Газонокосилки', group: 'garden' })
        }
      ],
      offers: empty
        ? []
        : [
            {
              id: 'paid',
              data: RawInventoryOfferSchema.parse({
                title: 'Дрель Model 100',
                summary: 'Дрель с кейсом и свёрлами.',
                owner: 'boris',
                kind: 'drill',
                price: { value: 1200, period: 'day' },
                photos: [
                  {
                    url: 'https://media.kpshelkovo.online/ukogo/paid/kit.jpeg',
                    width: 1920,
                    height: 1280,
                    alt: 'Дрель с кейсом',
                    caption: 'Кейс и сверла.'
                  },
                  {
                    url: 'https://media.kpshelkovo.online/ukogo/paid/label.jpeg',
                    width: 320,
                    height: 480,
                    alt: 'Шильдик дрели'
                  }
                ]
              }),
              body
            },
            {
              id: 'free',
              data: RawInventoryOfferSchema.parse({
                title: 'Дрель Model 200',
                summary: 'Дрель для домашних работ, вернуть чистой.',
                owner: 'anna',
                kind: 'drill',
                price: 0
              }),
              body
            },
            {
              id: 'negotiable',
              data: RawInventoryOfferSchema.parse({
                title: 'Дрель Model 300',
                summary: 'Отдельная дрель без кейса.',
                owner: 'boris',
                kind: 'drill',
                photos: [
                  {
                    url: 'https://media.kpshelkovo.online/ukogo/negotiable/drill.jpeg',
                    width: 960,
                    height: 1280,
                    alt: 'Дрель без кейса',
                    caption: 'Отдельная дрель, без кейса.'
                  }
                ]
              }),
              body
            },
            {
              id: 'garden',
              data: RawInventoryOfferSchema.parse({
                title: 'Газонокосилка',
                summary: 'Газонокосилка для ухода за участком.',
                owner: 'anna',
                kind: 'mower'
              })
            }
          ]
    },
    {
      parcels: new Map([
        ['SHP-ALIAS', { code: 'SHP-A1' }],
        ['SHP-A2', { code: 'SHP-A2' }]
      ])
    }
  );

import { describe, expect, it } from 'vitest';

import { mapRawInventoryPrice } from '../mapper';
import { RawInventoryOfferSchema, RawInventoryPhotoSchema } from '../raw-schema';
import { formatInventoryPrice } from '../view';

describe('inventory publication boundary', () => {
  it('requires an independently written summary instead of deriving it from the body', () => {
    const offer = { title: 'Вещь', owner: 'neighbor', kind: 'tool' };
    expect(
      [undefined, '', '   '].map(
        (summary) => RawInventoryOfferSchema.safeParse({ ...offer, summary }).success
      )
    ).toEqual([false, false, false]);
    expect(
      RawInventoryOfferSchema.parse({ ...offer, summary: '  Комплект со свёрлами.  ' }).summary
    ).toBe('Комплект со свёрлами.');
  });

  it.each([
    'ukogo/grinder-a/front.jpeg',
    'news/2026/01/tool/front.jpeg',
    'reviews/2026/12/tool/front.jpeg',
    'people/neighbor.jpeg',
    'kb/ok/2026-01-01/plan.png',
    'kb/ok/2026-01-01/plan.jpeg'
  ])('permits published images including reuse from %s', (path) => {
    expect(
      RawInventoryPhotoSchema.safeParse({
        url: `https://media.kpshelkovo.online/${path}`,
        width: 640,
        height: 480,
        alt: 'Комплект'
      }).success
    ).toBe(true);
  });

  it.each([
    'https://example.com/ukogo/a/front.jpeg',
    'http://media.kpshelkovo.online/ukogo/a/front.jpeg',
    'https://media.kpshelkovo.online/ukogo/a/front.jpeg?version=1',
    'https://media.kpshelkovo.online/ukogo/a/front.jpeg#x',
    'https://media.kpshelkovo.online/ukogo/a/front.jpeg?',
    'https://media.kpshelkovo.online/ukogo/a/front.jpg',
    'https://media.kpshelkovo.online/ukogo/a/front.png',
    'https://media.kpshelkovo.online/other/front.jpeg',
    'https://media.kpshelkovo.online/404.jpeg',
    'https://media.kpshelkovo.online/_media/front.jpeg',
    'https://media.kpshelkovo.online/news/tool/front.jpeg',
    'https://media.kpshelkovo.online/news/2026/13/tool/front.jpeg',
    'https://media.kpshelkovo.online/ukogo/a/../a/front.jpeg',
    'https://user@media.kpshelkovo.online/ukogo/a/front.jpeg'
  ])('rejects nonpublication photo URL %s', (url) => {
    expect(
      RawInventoryPhotoSchema.safeParse({ url, width: 640, height: 480, alt: 'Комплект' }).success
    ).toBe(false);
  });

  it('retains the price distinction and each period', () => {
    const prices = [
      undefined,
      0,
      { value: 1500, period: 'hour' },
      { value: 1500, period: 'day' },
      { value: 1500, period: 'once' }
    ];
    expect(
      prices.map((price) => {
        const raw = RawInventoryOfferSchema.parse({
          title: 'Вещь',
          summary: 'Комплект для работы.',
          owner: 'neighbor',
          kind: 'tool',
          price
        });
        const mapped = mapRawInventoryPrice(raw.price);
        return [mapped, formatInventoryPrice(mapped).replaceAll('\u00a0', '·')];
      })
    ).toMatchInlineSnapshot(`
      [
        [
          {
            "type": "negotiable",
          },
          "Цена по договорённости",
        ],
        [
          {
            "type": "free",
          },
          "Бесплатно",
        ],
        [
          {
            "period": "hour",
            "type": "fixed",
            "value": 1500,
          },
          "1·500·₽/час",
        ],
        [
          {
            "period": "day",
            "type": "fixed",
            "value": 1500,
          },
          "1·500·₽/сутки",
        ],
        [
          {
            "period": "once",
            "type": "fixed",
            "value": 1500,
          },
          "1·500·₽ разово",
        ],
      ]
    `);
  });

  it.each([
    { value: 0, period: 'day' },
    { value: 0.001, period: 'day' },
    { value: 1.001, period: 'day' },
    { value: -1, period: 'day' },
    { value: 100, period: 'week' },
    100
  ])('rejects ambiguous price shape %j', (price) => {
    expect(
      RawInventoryOfferSchema.safeParse({
        title: 'Вещь',
        summary: 'Комплект для работы.',
        owner: 'neighbor',
        kind: 'tool',
        price
      }).success
    ).toBe(false);
  });

  it('preserves the smallest monetary amount and ordinary fractional rubles without rounding to zero', () => {
    expect(
      [0.01, 1234.56].map((value) => {
        const raw = RawInventoryOfferSchema.parse({
          title: 'Вещь',
          summary: 'Комплект для работы.',
          owner: 'neighbor',
          kind: 'tool',
          price: { value, period: 'day' }
        });
        const price = mapRawInventoryPrice(raw.price);
        return [price, formatInventoryPrice(price).replaceAll('\u00a0', '·')];
      })
    ).toMatchInlineSnapshot(`
      [
        [
          {
            "period": "day",
            "type": "fixed",
            "value": 0.01,
          },
          "0,01·₽/сутки",
        ],
        [
          {
            "period": "day",
            "type": "fixed",
            "value": 1234.56,
          },
          "1·234,56·₽/сутки",
        ],
      ]
    `);
  });

  it('requires a nonempty gallery and descriptive metadata when supplied', () => {
    expect(
      RawInventoryOfferSchema.safeParse({
        title: 'Вещь',
        summary: 'Комплект для работы.',
        owner: 'neighbor',
        kind: 'tool',
        photos: []
      }).success
    ).toBe(false);
    expect(
      RawInventoryPhotoSchema.safeParse({
        url: 'https://media.kpshelkovo.online/ukogo/a/front.jpeg',
        width: 0,
        height: 480,
        alt: ' '
      }).success
    ).toBe(false);
  });
});

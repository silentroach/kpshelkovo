import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatContactPhone } from '@/lib/contact-methods/phone';
import { contactMethods } from '@/lib/contact-methods/view';

import type { ContactReview } from '../types';
import {
  contactPlace,
  formatContactCategory,
  formatContactReviewDate,
  hasManyPositiveContactReviews
} from '../view';

const reviewsOn = (
  sentiment: ContactReview['sentiment'],
  publishedIso: string,
  count = 1
): readonly Pick<ContactReview, 'sentiment' | 'publishedIso'>[] =>
  Array.from({ length: count }, () => ({ sentiment, publishedIso }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-01T09:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('contact view helpers', () => {
  it('formats category labels', () => {
    expect(formatContactCategory('fence')).toBe('Забор');
    expect(formatContactCategory('construction')).toBe('Строительство и ремонт');
    expect(formatContactCategory('furniture')).toBe('Мебель');
    expect(formatContactCategory('waste-removal')).toBe('Вывоз мусора');
    expect(formatContactCategory('garden')).toBe('Сад и участок');
    expect(formatContactCategory('food')).toBe('Еда и продукты');
    expect(formatContactCategory('electricity')).toBe('Электричество');
    expect(formatContactCategory('education')).toBe('Дети и обучение');
  });

  it('formats review dates', () => {
    expect(
      formatContactReviewDate({
        sentiment: 'positive',
        summary: 'Помогли с электричеством.',
        publishedAt: new Date('2026-04-07T00:00:00.000Z'),
        publishedIso: '2026-04-07',
        url: 'https://t.me/example/1'
      })
    ).toBe('7 апреля');
  });

  it.each([
    { positive: 0, neutral: 0, negative: 0, highlighted: false },
    { positive: 4, neutral: 0, negative: 0, highlighted: false },
    { positive: 5, neutral: 0, negative: 0, highlighted: true },
    { positive: 5, neutral: 0, negative: 1, highlighted: false },
    { positive: 0, neutral: 5, negative: 0, highlighted: false },
    { positive: 4, neutral: 1, negative: 0, highlighted: false },
    { positive: 5, neutral: 1, negative: 0, highlighted: true },
    { positive: 5, neutral: 1, negative: 1, highlighted: false }
  ])(
    'highlights $positive positive, $neutral neutral, $negative negative reviews: $highlighted',
    ({ positive, neutral, negative, highlighted }) => {
      expect(
        hasManyPositiveContactReviews([
          ...reviewsOn('positive', '2026-09-01', positive),
          ...reviewsOn('neutral', '2026-09-15', neutral),
          ...reviewsOn('negative', '2026-09-01', negative)
        ])
      ).toBe(highlighted);
    }
  );

  it.each([4, 5, 6])('counts %i positives strictly after the latest negative', (count) => {
    expect(
      hasManyPositiveContactReviews([
        ...reviewsOn('positive', '2026-06-01', 5),
        ...reviewsOn('negative', '2026-07-01'),
        ...reviewsOn('positive', '2026-08-01', count),
        ...reviewsOn('neutral', '2026-09-01')
      ])
    ).toBe(count >= 5);
  });

  it('starts the count again after another negative', () => {
    const recovered = [
      ...reviewsOn('negative', '2026-06-01'),
      ...reviewsOn('positive', '2026-07-01', 5)
    ];
    const reset = [...recovered, ...reviewsOn('negative', '2026-08-01')];

    expect(hasManyPositiveContactReviews(recovered)).toBe(true);
    expect(hasManyPositiveContactReviews(reset)).toBe(false);
    expect(
      hasManyPositiveContactReviews([...reset, ...reviewsOn('positive', '2026-09-01', 5)])
    ).toBe(true);
  });

  it.each([false, true])(
    'ignores same-day positives regardless of order (reversed: %s)',
    (reverse) => {
      const reviews = [
        ...reviewsOn('positive', '2026-07-01', 5),
        ...reviewsOn('negative', '2026-08-01'),
        ...reviewsOn('positive', '2026-08-01', 5),
        ...reviewsOn('positive', '2026-09-01', 4),
        ...reviewsOn('negative', '2026-06-01')
      ];
      const ordered = Object.freeze(reverse ? reviews.toReversed() : reviews);

      expect(hasManyPositiveContactReviews(ordered)).toBe(false);
      expect(
        hasManyPositiveContactReviews([...ordered, ...reviewsOn('positive', '2026-09-02')])
      ).toBe(true);
    }
  );

  it.each([
    { date: '2025-09-30', highlighted: false },
    { date: '2025-10-01', highlighted: true },
    { date: '2026-10-01', highlighted: true },
    { date: '2026-10-02', highlighted: false }
  ])('includes only positives inside the inclusive year: $date', ({ date, highlighted }) => {
    expect(
      hasManyPositiveContactReviews([
        ...reviewsOn('positive', '2026-09-01', 4),
        ...reviewsOn('positive', date)
      ])
    ).toBe(highlighted);
  });

  it.each([
    { date: '2025-09-30', highlighted: true },
    { date: '2025-10-01', highlighted: false },
    { date: '2026-10-01', highlighted: false },
    { date: '2026-10-02', highlighted: true }
  ])('includes only negatives inside the inclusive year: $date', ({ date, highlighted }) => {
    expect(
      hasManyPositiveContactReviews([
        ...reviewsOn('positive', '2025-10-01', 5),
        ...reviewsOn('negative', date)
      ])
    ).toBe(highlighted);
  });

  it.each([
    { date: '2023-02-27', highlighted: false },
    { date: '2023-02-28', highlighted: true },
    { date: '2024-02-29', highlighted: true },
    { date: '2024-03-01', highlighted: false }
  ])('uses a calendar year ending on leap day: $date', ({ date, highlighted }) => {
    expect(
      hasManyPositiveContactReviews(
        [...reviewsOn('positive', '2024-02-01', 4), ...reviewsOn('positive', date)],
        new Date('2024-02-29T09:00:00Z')
      )
    ).toBe(highlighted);
  });

  it.each([
    { now: '2026-10-01T20:59:59Z', highlighted: false },
    { now: '2026-10-01T21:00:00Z', highlighted: true }
  ])('uses the Moscow day at $now', ({ now, highlighted }) => {
    expect(
      hasManyPositiveContactReviews(
        [...reviewsOn('positive', '2026-09-01', 4), ...reviewsOn('positive', '2026-10-02')],
        new Date(now)
      )
    ).toBe(highlighted);
  });

  it('loses the star when a positive leaves the calendar-year window', () => {
    const reviews = [
      ...reviewsOn('positive', '2026-09-01', 4),
      ...reviewsOn('positive', '2025-10-01')
    ];

    expect(hasManyPositiveContactReviews(reviews, new Date('2026-10-01T09:00:00Z'))).toBe(true);
    expect(hasManyPositiveContactReviews(reviews, new Date('2026-10-02T09:00:00Z'))).toBe(false);
  });

  it('builds display methods in stable order with safe hrefs', () => {
    expect(
      contactMethods({
        phone: '+7 900 000-00-00',
        telegram: 'https://t.me/example',
        whatsapp: 'https://wa.me/79000000000',
        email: 'team@example.com',
        website: 'https://example.com'
      })
    ).toMatchInlineSnapshot(`
      [
        {
          "href": "tel:+79000000000",
          "label": "Телефон",
          "type": "phone",
          "value": "+7 900 000-00-00",
        },
        {
          "href": "https://t.me/example",
          "label": "Telegram",
          "type": "telegram",
          "value": "@example",
        },
        {
          "href": "https://wa.me/79000000000",
          "label": "WhatsApp",
          "type": "whatsapp",
          "value": "https://wa.me/79000000000",
        },
        {
          "href": "mailto:team@example.com",
          "label": "Email",
          "type": "email",
          "value": "team@example.com",
        },
        {
          "href": "https://example.com",
          "label": "Сайт",
          "type": "website",
          "value": "https://example.com",
        },
      ]
    `);
  });

  it('normalizes full Russian phones from real contact formats idempotently', () => {
    const phones = [
      '89969670018',
      '+7 (962) 140-34-31',
      '+7(916) 116-09-36',
      '+7 977 482-05-86',
      '+7 900 123‑45‑67',
      '+7 900 123–45–67',
      '+7.900.123.45.67'
    ];

    expect(
      phones.map((phone) => {
        const formatted = formatContactPhone(phone);

        return {
          phone,
          formatted,
          formattedAgain: formatContactPhone(formatted),
          href: contactMethods({ phone })[0]?.href
        };
      })
    ).toMatchInlineSnapshot(`
      [
        {
          "formatted": "+7 996 967-00-18",
          "formattedAgain": "+7 996 967-00-18",
          "href": "tel:+79969670018",
          "phone": "89969670018",
        },
        {
          "formatted": "+7 962 140-34-31",
          "formattedAgain": "+7 962 140-34-31",
          "href": "tel:+79621403431",
          "phone": "+7 (962) 140-34-31",
        },
        {
          "formatted": "+7 916 116-09-36",
          "formattedAgain": "+7 916 116-09-36",
          "href": "tel:+79161160936",
          "phone": "+7(916) 116-09-36",
        },
        {
          "formatted": "+7 977 482-05-86",
          "formattedAgain": "+7 977 482-05-86",
          "href": "tel:+79774820586",
          "phone": "+7 977 482-05-86",
        },
        {
          "formatted": "+7 900 123-45-67",
          "formattedAgain": "+7 900 123-45-67",
          "href": "tel:+79001234567",
          "phone": "+7 900 123‑45‑67",
        },
        {
          "formatted": "+7 900 123-45-67",
          "formattedAgain": "+7 900 123-45-67",
          "href": "tel:+79001234567",
          "phone": "+7 900 123–45–67",
        },
        {
          "formatted": "+7 900 123-45-67",
          "formattedAgain": "+7 900 123-45-67",
          "href": "tel:+79001234567",
          "phone": "+7.900.123.45.67",
        },
      ]
    `);
  });

  it('preserves international and unsafe phone text without guessing digits', () => {
    const phones = [
      '+49 (30) 1234‑5678',
      '+49 30/12345678',
      '+49 (0)30 1234-5678',
      '+7 900 000-00',
      '+7 900 ***-**-00',
      '+7 900 000-00-00 доб. 123'
    ];

    expect(phones.map((phone) => contactMethods({ phone })[0])).toMatchInlineSnapshot(`
      [
        {
          "href": "tel:+493012345678",
          "label": "Телефон",
          "type": "phone",
          "value": "+49 (30) 1234‑5678",
        },
        {
          "href": "tel:+493012345678",
          "label": "Телефон",
          "type": "phone",
          "value": "+49 30/12345678",
        },
        {
          "href": undefined,
          "label": "Телефон",
          "type": "phone",
          "value": "+49 (0)30 1234-5678",
        },
        {
          "href": undefined,
          "label": "Телефон",
          "type": "phone",
          "value": "+7 900 000-00",
        },
        {
          "href": undefined,
          "label": "Телефон",
          "type": "phone",
          "value": "+7 900 ***-**-00",
        },
        {
          "href": undefined,
          "label": "Телефон",
          "type": "phone",
          "value": "+7 900 000-00-00 доб. 123",
        },
      ]
    `);
  });

  it('builds a display place from location data', () => {
    expect(
      contactPlace({
        title: 'Золото Сибири',
        url: 'https://yandex.ru/maps/-/CTq-BEOk',
        address: 'Пионерская ул., 21, пгт Малино'
      })
    ).toMatchInlineSnapshot(`
      {
        "address": "Пионерская ул., 21, пгт Малино",
        "href": "https://yandex.ru/maps/-/CTq-BEOk",
        "label": "Адрес",
        "title": "Золото Сибири",
      }
    `);
  });
});

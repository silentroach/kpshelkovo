import { describe, expect, it } from 'vitest';

import { formatContactPhone } from '../phone';
import {
  contactMethods,
  contactPlace,
  formatContactCategory,
  formatContactReviewDate,
  hasManyPositiveContactReviews,
} from '../view';

describe('contact view helpers', () => {
  it('formats category labels', () => {
    expect(formatContactCategory('fence')).toBe('Забор');
    expect(formatContactCategory('construction')).toBe(
      'Строительство и ремонт',
    );
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
        url: 'https://t.me/example/1',
      }),
    ).toBe('7 апреля 2026');
  });

  it('marks contacts with at least five positive and no negative reviews', () => {
    expect(
      hasManyPositiveContactReviews([
        { sentiment: 'positive' },
        { sentiment: 'positive' },
        { sentiment: 'positive' },
        { sentiment: 'positive' },
        { sentiment: 'positive' },
      ]),
    ).toBe(true);
    expect(
      hasManyPositiveContactReviews([
        { sentiment: 'positive' },
        { sentiment: 'positive' },
        { sentiment: 'positive' },
        { sentiment: 'positive' },
      ]),
    ).toBe(false);
    expect(
      hasManyPositiveContactReviews([
        { sentiment: 'positive' },
        { sentiment: 'positive' },
        { sentiment: 'positive' },
        { sentiment: 'positive' },
        { sentiment: 'positive' },
        { sentiment: 'negative' },
      ]),
    ).toBe(false);
  });

  it('builds display methods in stable order with safe hrefs', () => {
    expect(
      contactMethods({
        phone: '+7 900 000-00-00',
        telegram: 'https://t.me/example',
        whatsapp: 'https://wa.me/79000000000',
        email: 'team@example.com',
        website: 'https://example.com',
      }),
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
      '+7.900.123.45.67',
    ];

    expect(
      phones.map((phone) => {
        const formatted = formatContactPhone(phone);

        return {
          phone,
          formatted,
          formattedAgain: formatContactPhone(formatted),
          href: contactMethods({ phone })[0]?.href,
        };
      }),
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
      '+7 900 000-00-00 доб. 123',
    ];

    expect(phones.map((phone) => contactMethods({ phone })[0]))
      .toMatchInlineSnapshot(`
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
        address: 'Пионерская ул., 21, пгт Малино',
      }),
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

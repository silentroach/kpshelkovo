import { describe, expect, it } from 'vitest';

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
        summaryHtml: '<p>Помогли с электричеством.</p>',
        publishedAt: new Date('2026-04-07T00:00:00.000Z'),
        publishedIso: '2026-04-07',
        url: 'https://t.me/example/1',
      }),
    ).toBe('7 апреля 2026');
  });

  it('marks contacts with at least three positive and no negative reviews', () => {
    expect(
      hasManyPositiveContactReviews([
        { sentiment: 'positive' },
        { sentiment: 'positive' },
        { sentiment: 'positive' },
      ]),
    ).toBe(true);
    expect(
      hasManyPositiveContactReviews([
        { sentiment: 'positive' },
        { sentiment: 'positive' },
      ]),
    ).toBe(false);
    expect(
      hasManyPositiveContactReviews([
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

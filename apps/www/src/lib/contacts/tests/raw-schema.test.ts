import { describe, expect, it } from 'vitest';

import { RawContactSchema } from '../raw-schema';

describe('RawContactSchema', () => {
  it('accepts the minimal contacts frontmatter', () => {
    expect(
      RawContactSchema.parse({
        title: 'Иван Петров',
        slug: 'ivan-petrov-fence',
        category: 'fence',
        updated_at: '2026-07-06',
        contacts: {
          phone: '+7 900 000-00-00',
        },
      }),
    ).toMatchInlineSnapshot(`
      {
        "category": "fence",
        "contacts": {
          "phone": "+7 900 000-00-00",
        },
        "slug": "ivan-petrov-fence",
        "title": "Иван Петров",
        "updated_at": "2026-07-06",
      }
    `);
  });

  it('accepts optional public contact methods and seo description', () => {
    expect(
      RawContactSchema.parse({
        title: 'Заборы и ворота',
        slug: 'fences-and-gates',
        category: 'fence',
        updated_at: '2026-07-06',
        contacts: {
          telegram: 'https://t.me/example',
          whatsapp: 'https://wa.me/79000000000',
          email: 'team@example.com',
          website: 'https://example.com',
        },
        seo: {
          description:
            'Контакт по заборам, который может быть полезен жителям Шелково.',
        },
      }).contacts,
    ).toMatchInlineSnapshot(`
      {
        "email": "team@example.com",
        "telegram": "https://t.me/example",
        "website": "https://example.com",
        "whatsapp": "https://wa.me/79000000000",
      }
    `);
  });

  it('accepts an optional location link', () => {
    expect(
      RawContactSchema.parse({
        title: 'Кора и земля',
        slug: 'bark-and-soil',
        category: 'garden',
        updated_at: '2026-07-07',
        contacts: {
          phone: '+7 900 000-00-00',
        },
        location: {
          title: 'Золото Сибири',
          url: 'https://yandex.ru/maps/-/CTq-BEOk',
          address: 'Пионерская ул., 21, пгт Малино',
          coordinates: { lat: 55.116326, lng: 38.16951 },
        },
      }).location,
    ).toMatchInlineSnapshot(`
      {
        "address": "Пионерская ул., 21, пгт Малино",
        "coordinates": {
          "lat": 55.116326,
          "lng": 38.16951,
        },
        "title": "Золото Сибири",
        "url": "https://yandex.ru/maps/-/CTq-BEOk",
      }
    `);
  });

  it('accepts dated review links', () => {
    expect(
      RawContactSchema.parse({
        title: 'Электрик',
        slug: 'electrician',
        category: 'electricity',
        updated_at: '2026-07-08',
        contacts: {
          phone: '+7 900 000-00-00',
        },
        reviews: [
          {
            sentiment: 'positive',
            summary: 'Помог с электричеством.',
            published_at: '2026-04-07',
            url: 'https://t.me/example/1',
          },
        ],
      }).reviews,
    ).toMatchInlineSnapshot(`
      [
        {
          "published_at": "2026-04-07",
          "sentiment": "positive",
          "summary": "Помог с электричеством.",
          "url": "https://t.me/example/1",
        },
      ]
    `);
  });

  it('accepts opt-in vCard overrides', () => {
    expect(
      RawContactSchema.parse({
        title: 'Александр Ерёмин',
        slug: 'alexander-eremin',
        category: 'electricity',
        updated_at: '2026-07-13',
        contacts: {
          phone: '+7 985 414-57-87',
        },
        vcf: {
          enable: true,
          kind: 'person',
          name: {
            family: 'Ерёмин',
            given: 'Александр',
          },
          note: 'Помогает по вопросам электричества.',
        },
      }).vcf,
    ).toMatchInlineSnapshot(`
      {
        "enable": true,
        "kind": "person",
        "name": {
          "family": "Ерёмин",
          "given": "Александр",
        },
        "note": "Помогает по вопросам электричества.",
      }
    `);
  });

  it('requires complete identity data for enabled vCards', () => {
    const base = {
      title: 'Полезный контакт',
      slug: 'useful-contact',
      category: 'garden',
      updated_at: '2026-07-13',
      contacts: { phone: '+7 900 000-00-00' },
    };

    expect(
      RawContactSchema.safeParse({
        ...base,
        vcf: {
          enable: true,
          kind: 'person',
          name: { given: 'Иван' },
        },
      }).success,
    ).toBe(false);
    expect(
      RawContactSchema.safeParse({
        ...base,
        vcf: { enable: true, kind: 'organization' },
      }).success,
    ).toBe(false);
  });

  it('rejects invalid slugs, impossible dates and unknown categories', () => {
    const base = {
      title: 'Иван Петров',
      slug: 'ivan-petrov-fence',
      category: 'fence',
      updated_at: '2026-07-06',
      contacts: { phone: '+7 900 000-00-00' },
    };

    expect(
      RawContactSchema.safeParse({ ...base, slug: 'Bad Slug' }).success,
    ).toBe(false);
    expect(
      RawContactSchema.safeParse({ ...base, updated_at: '2026-02-30' }).success,
    ).toBe(false);
    expect(
      RawContactSchema.safeParse({ ...base, category: 'gates' }).success,
    ).toBe(false);
  });

  it('rejects blank and missing public contact methods', () => {
    const base = {
      title: 'Иван Петров',
      slug: 'ivan-petrov-fence',
      category: 'fence',
      updated_at: '2026-07-06',
    };

    expect(RawContactSchema.safeParse({ ...base, contacts: {} }).success).toBe(
      false,
    );
    expect(
      RawContactSchema.safeParse({ ...base, contacts: { phone: '   ' } })
        .success,
    ).toBe(false);
  });

  it('rejects non-HTTPS contact URLs', () => {
    const base = {
      title: 'Иван Петров',
      slug: 'ivan-petrov-fence',
      category: 'fence',
      updated_at: '2026-07-06',
    };

    expect(
      RawContactSchema.safeParse({
        ...base,
        contacts: { website: 'http://example.com' },
      }).success,
    ).toBe(false);
    expect(
      RawContactSchema.safeParse({
        ...base,
        contacts: { telegram: 'javascript:alert(1)' },
      }).success,
    ).toBe(false);
    expect(
      RawContactSchema.safeParse({
        ...base,
        contacts: { phone: '+7 900 000-00-00' },
        location: { title: 'Карта', url: 'http://example.com' },
      }).success,
    ).toBe(false);
    expect(
      RawContactSchema.safeParse({
        ...base,
        contacts: { phone: '+7 900 000-00-00' },
        reviews: [
          {
            sentiment: 'positive',
            summary: 'Отзыв.',
            published_at: '2026-04-07',
            url: 'http://example.com',
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('rejects fields excluded from the contract', () => {
    const result = RawContactSchema.safeParse({
      title: 'Иван Петров',
      slug: 'ivan-petrov-fence',
      category: 'fence',
      updated_at: '2026-07-06',
      contacts: { phone: '+7 900 000-00-00' },
      status: 'draft',
      reviews: [],
      paid_placement: true,
    });

    expect(result.success).toBe(false);
  });
});

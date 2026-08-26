import { beforeAll, describe, expect, it } from 'vitest';

import type { Contact } from '../types';

let contactPageSchema: typeof import('../seo').contactPageSchema;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ contactPageSchema } = await import('../seo'));
});

const contact = {
  slug: 'ivan-petrov-fence',
  title: 'Иван Петров',
  category: 'fence',
  updatedAt: new Date('2026-07-06T00:00:00.000Z'),
  updatedIso: '2026-07-06',
  contacts: {
    phone: '+7 900 000-00-00',
    telegram: 'https://t.me/example',
  },
  reviews: [],
  url: '/sarafan/fence/ivan-petrov-fence/',
  markdownUrl: '/sarafan/fence/ivan-petrov-fence/index.md',
  canonical: 'https://example.com/sarafan/fence/ivan-petrov-fence/',
  body: 'Работает с заборами и воротами.',
  mentions: [],
} satisfies Contact;

describe('contactPageSchema', () => {
  it('publishes a ContactPage with a ContactPoint without ratings or review claims', () => {
    const schema = contactPageSchema({
      contact,
      description: 'Контакт из раздела «Сарафан»: Забор.',
      breadcrumbs: [],
    });

    expect(schema).toMatchInlineSnapshot(`
      [
        {
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "about": {
            "@id": "https://example.com/sarafan/fence/ivan-petrov-fence/#contact",
          },
          "dateModified": "2026-07-06",
          "description": "Контакт из раздела «Сарафан»: Забор.",
          "inLanguage": "ru-RU",
          "mainEntity": {
            "@id": "https://example.com/sarafan/fence/ivan-petrov-fence/#contact",
          },
          "name": "Иван Петров",
          "url": "https://example.com/sarafan/fence/ivan-petrov-fence/",
        },
        {
          "@context": "https://schema.org",
          "@id": "https://example.com/sarafan/fence/ivan-petrov-fence/#contact",
          "@type": "ContactPoint",
          "areaServed": {
            "@type": "Place",
            "name": "Шелково",
          },
          "availableLanguage": "ru-RU",
          "contactType": "Забор",
          "description": "Работает с заборами и воротами.",
          "name": "Иван Петров",
          "sameAs": [
            "https://t.me/example",
          ],
          "telephone": "+7 900 000-00-00",
          "url": "https://example.com/sarafan/fence/ivan-petrov-fence/",
        },
      ]
    `);
    expect(JSON.stringify(schema)).not.toMatch(
      /Review|Rating|AggregateRating/u,
    );
  });
});

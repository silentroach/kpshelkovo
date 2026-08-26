/// <reference types="astro/client" />

import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';
import type { Contact, ContactReview } from '@/lib/contacts/types';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import ContactListItem from '../ContactListItem.astro';

const positiveReview = {
  sentiment: 'positive',
  summary: 'Работу оценили положительно.',
  publishedAt: new Date('2026-08-01T00:00:00.000Z'),
  publishedIso: '2026-08-01',
  url: 'https://t.me/example/1',
} satisfies ContactReview;

const contact = {
  slug: 'example',
  title: 'Исполнитель',
  category: 'construction',
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedIso: '2026-08-01',
  contacts: { phone: '+7 900 000-00-00' },
  location: {
    title: 'Пример места',
    url: 'https://yandex.ru/maps/example',
  },
  reviews: [
    positiveReview,
    positiveReview,
    positiveReview,
    positiveReview,
    positiveReview,
  ],
  url: '/sarafan/construction/example/',
  markdownUrl: '/sarafan/construction/example/index.md',
  canonical: 'https://example.com/sarafan/construction/example/',
  body: '',
  mentions: [],
} satisfies Contact;

describe('ContactListItem', () => {
  it('does not expose contact details in a list item', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ContactListItem, {
      props: { contact },
    });

    expect(html).toContain('href="/sarafan/construction/example/"');
    expect(html).not.toMatch(/\+7 900 000-00-00|yandex\.ru\/maps\/example/u);
  });

  it('describes the review highlight with a native title', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ContactListItem, {
      props: { contact },
    });

    expect(html).toContain(
      'role="img" aria-label="Много положительных отзывов" title="Много положительных отзывов"',
    );
    expect(html).not.toContain('role="tooltip"');
    expect(html).toMatch(/<svg[^>]+aria-hidden="true"/u);
  });
});

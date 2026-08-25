/// <reference types="astro/client" />

import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';
import type { Contact, ContactReview } from '@/lib/contacts/types';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import ContactListItem from '../ContactListItem.astro';

const positiveReview = {
  sentiment: 'positive',
  summary: 'Работу оценили положительно.',
  summaryHtml: '<p>Работу оценили положительно.</p>',
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
  reviews: [
    positiveReview,
    positiveReview,
    positiveReview,
    positiveReview,
    positiveReview,
  ],
  hasDetailPage: false,
  body: '',
  mentions: [],
} satisfies Contact;

describe('ContactListItem', () => {
  it('explains the review highlight in text and hides its star from assistive technology', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ContactListItem, {
      props: { contact },
    });

    expect(html).toContain('title="Много положительных отзывов"');
    expect(html).toContain(
      '<span class="sr-only">Много положительных отзывов</span>',
    );
    expect(html).toMatch(/<svg[^>]+aria-hidden="true"/u);
  });
});

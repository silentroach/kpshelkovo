/// <reference types="astro/client" />

import { type HTMLElement, Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';

import { visibleWhitespace } from '@/lib/test/visible-whitespace';
import { createAstroContainer } from '@/test/astro-container';

import type { Contact } from '../types';

const fixture = vi.hoisted(() => ({
  contact: {
    slug: 'sergey',
    title: 'Сергей',
    category: 'construction' as const,
    updatedAt: new Date('2026-07-06T00:00:00.000Z'),
    updatedIso: '2026-07-06',
    summary: 'Строительство домов под ключ.',
    contacts: { phone: '89969670018' },
    reviews: [],
    body: 'Работает в Шелково и соседних посёлках.',
    mentions: [],
    url: '/sarafan/construction/sergey/',
    markdownUrl: '/sarafan/construction/sergey/index.md',
    canonical: 'https://example.com/sarafan/construction/sergey/'
  } satisfies Contact
}));

vi.mock('@/lib/contacts/load', () => ({
  loadContacts: async () => [fixture.contact],
  loadContact: async () => fixture.contact
}));

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import ContactPage from '@/pages/sarafan/[category]/[slug]/index.astro';

const parsePage = (html: string): HTMLElement => {
  const document = new Window().document;
  document.write(html);

  return document.body;
};

describe('/sarafan/[category]/[slug]/', () => {
  it('indexes the summary and body without indexing contact methods', async () => {
    const container = await createAstroContainer();
    const page = parsePage(
      await container.renderToString(ContactPage, {
        params: {
          category: fixture.contact.category,
          slug: fixture.contact.slug
        },
        request: new Request(fixture.contact.canonical)
      })
    );
    const searchBodies = page.querySelectorAll('[data-pagefind-body]');
    if (searchBodies.length === 0) {
      throw new Error('contact Pagefind bodies not found');
    }

    const phoneLink = page.querySelector('a[href^="tel:"]');
    const searchText = Array.from(searchBodies, ({ textContent }) => textContent)
      .join(' ')
      .trim();

    expect({
      phoneInPage: page.textContent.includes('+7 996 967-00-18'),
      phoneHref: phoneLink?.getAttribute('href'),
      phoneInSearch: searchText.includes('+7 996 967-00-18'),
      searchText: visibleWhitespace(searchText)
    }).toMatchInlineSnapshot(`
      {
        "phoneHref": "tel:+79969670018",
        "phoneInPage": true,
        "phoneInSearch": false,
        "searchText": "Строительство домов под·ключ. Работает в·Шелково и·соседних посёлках.",
      }
    `);
  });
});

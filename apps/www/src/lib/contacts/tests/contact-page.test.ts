/// <reference types="astro/client" />

import { type HTMLElement, Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';
import { visibleWhitespace } from '@/lib/test/visible-whitespace';

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
    body: '',
    mentions: [],
    url: '/sarafan/construction/sergey/',
    markdownUrl: '/sarafan/construction/sergey/index.md',
    canonical: 'https://example.com/sarafan/construction/sergey/',
  } satisfies Contact,
}));

vi.mock('@/lib/contacts/load', () => ({
  loadContacts: async () => [fixture.contact],
  loadContact: async () => fixture.contact,
}));

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import ContactPage from '@/pages/sarafan/[category]/[slug]/index.astro';

const parsePage = (html: string): HTMLElement => {
  const document = new Window().document;
  document.write(html);

  return document.body;
};

describe('/sarafan/[category]/[slug]/', () => {
  it('keeps a blank-body contact searchable without indexing its methods', async () => {
    const container = await createAstroContainer();
    const page = parsePage(
      await container.renderToString(ContactPage, {
        params: {
          category: fixture.contact.category,
          slug: fixture.contact.slug,
        },
        request: new Request(fixture.contact.canonical),
      }),
    );
    const searchBody = page.querySelector('[data-pagefind-body]');
    if (!searchBody) {
      throw new Error('contact Pagefind body not found');
    }

    const phoneLink = page.querySelector('a[href^="tel:"]');

    expect({
      phoneInPage: page.textContent.includes('+7 996 967-00-18'),
      phoneHref: phoneLink?.getAttribute('href'),
      phoneInSearch: searchBody.textContent.includes('+7 996 967-00-18'),
      searchText: visibleWhitespace(searchBody.textContent.trim()),
    }).toMatchInlineSnapshot(`
      {
        "phoneHref": "tel:+79969670018",
        "phoneInPage": true,
        "phoneInSearch": false,
        "searchText": "Строительство домов под·ключ.",
      }
    `);
  });
});

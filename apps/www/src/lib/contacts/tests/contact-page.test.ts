/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { visibleWhitespace } from '@/lib/test/visible-whitespace';
import { createAstroContainer } from '@/test/astro-container';

import type { Contact } from '../types';

const fixture = vi.hoisted(() => {
  const contact: Contact = {
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
  };
  return { contact };
});

vi.mock('@/lib/contacts/load', () => ({
  loadContacts: async () => [fixture.contact],
  loadContact: async () => fixture.contact
}));

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import ContactPage from '@/pages/sarafan/[category]/[slug]/index.astro';

const parsePage = (html: string) => {
  const document = new Window().document;
  document.write(html);

  return document;
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
      phoneInPage: page.body.textContent.includes('+7 996 967-00-18'),
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

  it.each([
    { body: '', seo: undefined },
    { body: '', seo: { description: 'Монтаж электроснабжения.' } },
    { body: 'Контактное лицо: Алексей.', seo: undefined },
    { body: 'Контактное лицо: Алексей.', seo: { description: 'Монтаж электроснабжения.' } }
  ])('separates visible content, search and meta for $body / $seo', async ({ body, seo }) => {
    fixture.contact = { ...fixture.contact, body, seo };
    const container = await createAstroContainer();
    const page = parsePage(
      await container.renderToString(ContactPage, {
        params: { category: fixture.contact.category, slug: fixture.contact.slug },
        request: new Request(fixture.contact.canonical)
      })
    );
    const expectedDescription = seo?.description ?? fixture.contact.summary;
    const schema = Array.from(page.querySelectorAll('script[type="application/ld+json"]')).map(
      (script) =>
        z
          .object({
            '@type': z.string(),
            description: z.string().optional()
          })
          .parse(JSON.parse(script.textContent))
    );
    const searchRoot = page.querySelector('[data-search-description]');

    expect({
      summary: visibleWhitespace(page.querySelector('.sarafan-contact-summary')?.textContent ?? ''),
      proseMatches: body
        ? page.querySelector('.sarafan-contact-prose')?.textContent.trim() === body
        : !page.querySelector('.sarafan-contact-prose'),
      metadataMatches: [
        page.querySelector('meta[name="description"]')?.getAttribute('content'),
        page.querySelector('meta[property="og:description"]')?.getAttribute('content'),
        page.querySelector('meta[name="twitter:description"]')?.getAttribute('content'),
        schema.find((item) => item['@type'] === 'ContactPage')?.description
      ].every((value) => value === expectedDescription),
      searchDescription: searchRoot?.getAttribute('data-search-description'),
      phone: page.querySelector('a[href^="tel:"]')?.getAttribute('href')
    }).toMatchInlineSnapshot(`
      {
        "metadataMatches": true,
        "phone": "tel:+79969670018",
        "proseMatches": true,
        "searchDescription": "Строительство домов под ключ.",
        "summary": "Строительство домов под·ключ.",
      }
    `);
    expect(page.querySelector('main')?.textContent).not.toContain('Перед обращением');
    if (seo) {
      expect(page.querySelector('main')?.textContent).not.toContain(seo.description);
    }
  });

  it('indexes all review sentiments without their surrounding labels or dates', async () => {
    fixture.contact = {
      ...fixture.contact,
      body: '',
      seo: { description: 'Текст только для метаданных.' },
      reviews: (['positive', 'neutral', 'negative'] as const).map((sentiment) => ({
        sentiment,
        summary: `${sentiment} опыт.`,
        publishedAt: new Date('2026-09-19T00:00:00.000Z'),
        publishedIso: '2026-09-19',
        url: `https://t.me/example/${sentiment}`
      }))
    };
    const container = await createAstroContainer();
    const page = parsePage(
      await container.renderToString(ContactPage, {
        params: { category: fixture.contact.category, slug: fixture.contact.slug },
        request: new Request(fixture.contact.canonical)
      })
    );
    const roots = Array.from(page.querySelectorAll('[data-pagefind-body]'));
    expect(
      roots.map((root) => ({
        text: visibleWhitespace(root.textContent.trim()),
        ignored: Boolean(root.closest('[data-pagefind-ignore="all"]'))
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "ignored": false,
          "text": "Строительство домов под·ключ.",
        },
        {
          "ignored": false,
          "text": "positive опыт.",
        },
        {
          "ignored": false,
          "text": "neutral опыт.",
        },
        {
          "ignored": false,
          "text": "negative опыт.",
        },
      ]
    `);
    expect(
      Array.from(page.querySelectorAll('.contact-review__overlay'), (link) =>
        link.getAttribute('href')
      )
    ).toEqual(fixture.contact.reviews.map((review) => review.url));
  });
});

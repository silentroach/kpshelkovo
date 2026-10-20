/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import ContactMethods from '@/components/contacts/ContactMethods.astro';
import { createAstroContainer } from '@/test/astro-container';

const contacts = {
  phone: '89969670018',
  telegram: 'https://t.me/example',
  whatsapp: 'https://wa.me/79969670018',
  email: 'team@example.com',
  website: 'https://example.com'
} as const;

describe('ContactMethods component', () => {
  it('keeps the existing heading ID and accessible name without an explicit ID', async () => {
    const container = await createAstroContainer();
    const document = new Window().document;
    document.body.innerHTML = await container.renderToString(ContactMethods, {
      props: {
        contacts,
        location: { title: 'Мастерская', url: 'https://example.com/map' }
      }
    });
    const section = document.querySelector('section');
    const headingId = section?.getAttribute('aria-labelledby') ?? '';

    expect({
      headingId,
      name: document.getElementById(headingId)?.textContent.trim(),
      place: section?.querySelector('a')?.getAttribute('href')
    }).toMatchInlineSnapshot(`
      {
        "headingId": "contact-methods",
        "name": "Контакты и адрес",
        "place": "https://example.com/map",
      }
    `);
  });

  it('labels repeated blocks for the same owner independently and keeps native contact links', async () => {
    const container = await createAstroContainer();
    const document = new Window().document;
    const blocks = await Promise.all(
      ['offer-first-contacts', 'offer-second-contacts'].map((headingId) =>
        container.renderToString(ContactMethods, { props: { contacts, headingId } })
      )
    );
    document.body.innerHTML = blocks.join('');
    const ids = Array.from(document.querySelectorAll('[id]'), ({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(
      Array.from(document.querySelectorAll('section'), (section) => {
        const headingId = section.getAttribute('aria-labelledby') ?? '';

        return {
          headingId,
          ownHeading: section.querySelector('h2')?.id === headingId,
          name: document.getElementById(headingId)?.textContent.trim()
        };
      })
    ).toMatchInlineSnapshot(`
      [
        {
          "headingId": "offer-first-contacts",
          "name": "Способы связи",
          "ownHeading": true,
        },
        {
          "headingId": "offer-second-contacts",
          "name": "Способы связи",
          "ownHeading": true,
        },
      ]
    `);

    for (const section of document.querySelectorAll('section')) {
      const links = Array.from(section.querySelectorAll('a'));

      expect(links.every((link) => link.tabIndex === 0)).toBe(true);
      expect(links.map((link) => link.getAttribute('href'))).toMatchInlineSnapshot(`
        [
          "tel:+79969670018",
          "https://t.me/example",
          "https://wa.me/79969670018",
          "mailto:team@example.com",
          "https://example.com",
        ]
      `);
    }
  });

  it('keeps every contact action and accessible label in compact mode', async () => {
    const container = await createAstroContainer();
    const document = new Window().document;
    document.body.innerHTML = await container.renderToString(ContactMethods, {
      props: { contacts, compact: true, headingId: 'offer-example-contacts', headingLevel: 'h3' }
    });
    expect(document.querySelector('section')?.getAttribute('aria-labelledby')).toBe(
      'offer-example-contacts'
    );
    expect(document.querySelector('h3')?.id).toBe('offer-example-contacts');
    expect([...document.querySelectorAll('dl a')].map((link) => link.getAttribute('href')))
      .toMatchInlineSnapshot(`
      [
        "tel:+79969670018",
        "https://t.me/example",
        "https://wa.me/79969670018",
        "mailto:team@example.com",
        "https://example.com",
      ]
    `);
    expect([...document.querySelectorAll('dt')].every((label) => !!label.textContent.trim())).toBe(
      true
    );
  });
});

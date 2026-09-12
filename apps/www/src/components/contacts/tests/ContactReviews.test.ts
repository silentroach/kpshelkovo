/// <reference types="astro/client" />

import { type HTMLElement, Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import { mapRawContact } from '@/lib/contacts/mapper';
import { buildContactMarkdown } from '@/lib/contacts/markdown';
import { RawContactSchema } from '@/lib/contacts/raw-schema';
import type { ContactReview } from '@/lib/contacts/types';
import { visibleWhitespace } from '@/lib/test/visible-whitespace';
import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import ContactReviews from '../ContactReviews.astro';

const review = {
  sentiment: 'positive',
  summary: 'Помог с **электричеством** в "Шелково Парк".\n\n<script>alert(1)</script>',
  publishedAt: new Date('2026-04-07T00:00:00.000Z'),
  publishedIso: '2026-04-07',
  url: 'https://www.t.me/example/1'
} satisfies ContactReview;

const parseComponent = (html: string): HTMLElement => {
  const document = new Window().document;
  document.write(html);

  return document.body;
};

describe('ContactReviews', () => {
  it('preserves a neutral review from raw data through HTML and Markdown', async () => {
    const contact = mapRawContact({
      id: 'construction/example',
      body: '',
      data: RawContactSchema.parse({
        title: 'Мастер',
        slug: 'example',
        category: 'construction',
        updated_at: review.publishedIso,
        contacts: { phone: '+7 900 000-00-00' },
        reviews: [
          {
            sentiment: 'neutral',
            summary: review.summary,
            published_at: review.publishedIso,
            url: review.url
          }
        ]
      })
    });
    const container = await createAstroContainer();
    const component = parseComponent(
      await container.renderToString(ContactReviews, {
        props: { reviews: contact.reviews }
      })
    );

    expect(component.querySelector('li')?.textContent).toContain('Нейтральный:');
    expect(component.querySelector('a')?.getAttribute('href')).toBe(review.url);
    expect(buildContactMarkdown(contact)).toContain('sentiment: neutral');
  });

  it('renders safe review markdown with site typography', async () => {
    const container = await createAstroContainer();
    const component = parseComponent(
      await container.renderToString(ContactReviews, {
        props: { reviews: [review] }
      })
    );
    const summary = component.querySelector('[data-pagefind-body]');
    if (!summary) {
      throw new Error('review summary not found');
    }

    expect(
      visibleWhitespace({
        html: summary.innerHTML,
        scripts: summary.querySelectorAll('script').length,
        text: summary.textContent
      })
    ).toMatchInlineSnapshot(`
      {
        "html": "<p>Помог с <strong>электричеством</strong> в&nbsp;«Шелково&nbsp;Парк».</p>",
        "scripts": 0,
        "text": "Помог с электричеством в·«Шелково·Парк».",
      }
    `);
  });

  it('shows the Telegram icon without changing the source URL', async () => {
    const container = await createAstroContainer();
    const component = parseComponent(
      await container.renderToString(ContactReviews, {
        props: { reviews: [review] }
      })
    );

    expect({
      icons: component.querySelectorAll('svg').length,
      sourceUrl: component.querySelector('a')?.getAttribute('href')
    }).toMatchInlineSnapshot(`
      {
        "icons": 1,
        "sourceUrl": "https://www.t.me/example/1",
      }
    `);
  });
});

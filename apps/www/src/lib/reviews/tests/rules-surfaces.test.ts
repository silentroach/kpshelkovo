/// <reference types="astro/client" />

import { describe, expect, it, vi } from 'vitest';
import { type Element, type HTMLElement, Window } from 'happy-dom';

import { renderMarkdown } from '@/lib/markdown/render';
import { createAstroContainer } from '@/test/astro-container';

import { buildReviewMarkdown, buildReviewsRulesMarkdown } from '../markdown';
import { REVIEW_RULES } from '../rules';
import type { Review } from '../types';

const fixture = vi.hoisted(() => ({
  review: {
    id: '2026-08-25-review-rules-contract',
    slug: 'review-rules-contract',
    author: 'Алексей',
    area: 'forest' as const,
    publishedAt: new Date('2026-08-25T00:00:00.000Z'),
    publishedIso: '2026-08-25',
    url: '/reviews/2026-08-25-review-rules-contract/',
    markdownUrl: '/reviews/2026-08-25-review-rules-contract/index.md',
    canonical: 'https://example.com/reviews/2026-08-25-review-rules-contract/',
    body: 'Основной текст отзыва.',
    aspects: [],
    mentions: [],
  } satisfies Review,
}));

vi.mock('@/lib/reviews/load', () => ({
  loadReviews: async () => [fixture.review],
  loadReview: async () => fixture.review,
}));

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import ReviewPage from '@/pages/reviews/[id]/index.astro';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import ReviewRulesPage from '@/pages/reviews/rules/index.astro';

const parseMain = (html: string): HTMLElement => {
  const document = new Window().document;
  document.write(html);
  const main = document.querySelector('main');
  if (!main) {
    throw new Error('required element "main" not found');
  }

  return main;
};

const elementText = (element: Element): string => {
  const content = element.cloneNode(true) as Element;
  content.querySelectorAll('.ui-heading-anchor').forEach((anchor) => {
    anchor.remove();
  });

  return (content.textContent ?? '').replace(/\s+/gu, ' ').trim();
};

const markdownText = (markdown: string): string => {
  const document = new Window().document;
  document.body.innerHTML = renderMarkdown(markdown);

  return elementText(document.body);
};

describe('review rules public surfaces', () => {
  it('renders the shared contract in HTML and Markdown', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ReviewRulesPage, {
      request: new Request('https://example.com/reviews/rules/'),
    });
    const main = parseMain(html);
    const markdown = buildReviewsRulesMarkdown();
    const title = main.querySelector('h1');
    const rules = main.querySelector('article');
    if (!title || !rules) {
      throw new Error('review rules page content not found');
    }

    expect({
      htmlMatchesMarkdown:
        `${elementText(title)} ${elementText(rules)}` ===
        markdownText(markdown),
      telegramHref: rules
        .querySelector('a[href="https://t.me/silentroach"]')
        ?.getAttribute('href'),
    }).toMatchInlineSnapshot(`
      {
        "htmlMatchesMarkdown": true,
        "telegramHref": "https://t.me/silentroach",
      }
    `);
  });

  it('uses the shared disclaimer on review detail surfaces', async () => {
    const container = await createAstroContainer();
    const main = parseMain(
      await container.renderToString(ReviewPage, {
        params: { id: fixture.review.id },
        request: new Request(fixture.review.canonical),
      }),
    );
    const disclaimer = main.querySelector(
      '[aria-labelledby="review-disclaimer"]',
    );
    if (!disclaimer) {
      throw new Error('review disclaimer not found');
    }
    const markdown = buildReviewMarkdown(fixture.review);
    const disclaimerHeading = disclaimer.querySelector('h2');
    const disclaimerBody = disclaimer.querySelector('div');
    if (!disclaimerHeading || !disclaimerBody) {
      throw new Error('review disclaimer content not found');
    }
    const expectedBody = markdownText(REVIEW_RULES.disclaimer.bodyMarkdown);
    const expectedDisclaimerMarkdown = `## ${REVIEW_RULES.disclaimer.heading}\n\n${REVIEW_RULES.disclaimer.bodyMarkdown}`;

    expect({
      htmlBodyMatchesSource: elementText(disclaimerBody) === expectedBody,
      htmlHeadingMatchesSource:
        elementText(disclaimerHeading) === REVIEW_RULES.disclaimer.heading,
      markdownEndsWithSource: markdown.endsWith(expectedDisclaimerMarkdown),
    }).toMatchInlineSnapshot(`
      {
        "htmlBodyMatchesSource": true,
        "htmlHeadingMatchesSource": true,
        "markdownEndsWithSource": true,
      }
    `);
  });
});

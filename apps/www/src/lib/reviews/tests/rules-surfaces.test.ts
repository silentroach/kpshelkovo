/// <reference types="astro/client" />

import { describe, expect, it, vi } from 'vitest';
import { type Element, type HTMLElement, Window } from 'happy-dom';

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

const elementText = (element: Element): string =>
  (element.textContent ?? '').replace(/\s+/gu, ' ').trim();

const missingCopy = (
  content: string,
  copy: readonly string[],
): readonly string[] =>
  copy.filter((statement) => !content.includes(statement));

const sharedRulesCopy = [
  REVIEW_RULES.title,
  REVIEW_RULES.eligibility.heading,
  REVIEW_RULES.eligibility.text,
  REVIEW_RULES.submission.heading,
  REVIEW_RULES.submission.telegram.label,
  REVIEW_RULES.submission.ownershipVerification,
  REVIEW_RULES.submission.dataHandling,
  REVIEW_RULES.editing.heading,
  REVIEW_RULES.editing.text,
  REVIEW_RULES.rejection.heading,
  ...REVIEW_RULES.rejection.reasons,
  REVIEW_RULES.disclaimer.heading,
  REVIEW_RULES.disclaimer.text,
  REVIEW_RULES.rightsViolation.heading,
  REVIEW_RULES.rightsViolation.text,
] as const;

const rulesHeadings = [
  ['H1', REVIEW_RULES.title],
  ['H2', REVIEW_RULES.eligibility.heading],
  ['H2', REVIEW_RULES.submission.heading],
  ['H2', REVIEW_RULES.editing.heading],
  ['H2', REVIEW_RULES.rejection.heading],
  ['H2', REVIEW_RULES.disclaimer.heading],
  ['H2', REVIEW_RULES.rightsViolation.heading],
] as const;

describe('review rules public surfaces', () => {
  it('renders the shared contract in HTML and Markdown', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ReviewRulesPage, {
      request: new Request('https://example.com/reviews/rules/'),
    });
    const main = parseMain(html);
    const markdown = buildReviewsRulesMarkdown();
    const telegramLink = [...main.querySelectorAll('a')].find(
      (link) => elementText(link) === REVIEW_RULES.submission.telegram.label,
    );

    expect({
      missingFromHtml: missingCopy(elementText(main), sharedRulesCopy),
      missingFromMarkdown: missingCopy(markdown, sharedRulesCopy),
      markdownHasTelegramLink: markdown.includes(
        `[${REVIEW_RULES.submission.telegram.label}](${REVIEW_RULES.submission.telegram.href})`,
      ),
    }).toMatchInlineSnapshot(`
      {
        "markdownHasTelegramLink": true,
        "missingFromHtml": [],
        "missingFromMarkdown": [],
      }
    `);

    expect(
      [...main.querySelectorAll('h1, h2')].map((heading) => [
        heading.tagName,
        elementText(heading),
      ]),
    ).toEqual(rulesHeadings);
    expect([...main.querySelectorAll('ul > li')].map(elementText)).toEqual(
      REVIEW_RULES.rejection.reasons,
    );
    expect({
      href: telegramLink?.getAttribute('href'),
      label: telegramLink ? elementText(telegramLink) : undefined,
    }).toEqual(REVIEW_RULES.submission.telegram);
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
    const disclaimerCopy = [
      REVIEW_RULES.disclaimer.heading,
      REVIEW_RULES.disclaimer.text,
    ];

    expect({
      missingFromHtml: missingCopy(elementText(disclaimer), disclaimerCopy),
      missingFromMarkdown: missingCopy(markdown, disclaimerCopy),
    }).toMatchInlineSnapshot(`
      {
        "missingFromHtml": [],
        "missingFromMarkdown": [],
      }
    `);
  });
});

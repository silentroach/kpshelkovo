/// <reference types="astro/client" />

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import StarRating from '@shelkovo/ui/StarRating.astro';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

describe('StarRating defaults', () => {
  it.each([1, 3, 5])(
    'keeps its accessible label and %i filled stars without customization',
    async (rating) => {
      const container = await createAstroContainer();
      const html = await container.renderToString(StarRating, {
        props: { rating, label: `Оценка ${rating} из 5` }
      });
      const document = new Window().document;
      document.body.innerHTML = html;

      expect(document.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
        `Оценка ${rating} из 5`
      );
      expect(document.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(5);
      expect(document.querySelectorAll('svg.star-rating__star--filled')).toHaveLength(rating);
    }
  );
});

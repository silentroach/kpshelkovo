// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';

import { bindContactReviewHighlightTooltips } from '../review-highlight.dom';

beforeEach(() => {
  document.body.innerHTML = `
    <span
      data-contact-review-highlight-trigger
      tabindex="0"
      aria-describedby="review-highlight-tooltip"
    >
      <svg><path data-star-path></path></svg>
    </span>
    <span id="review-highlight-tooltip" role="tooltip">Tooltip</span>
    <button type="button">Next</button>
  `;
});

describe('bindContactReviewHighlightTooltips', () => {
  it('dismisses the tooltip with Escape until hover or focus returns', () => {
    const trigger = document.querySelector<HTMLElement>(
      '[data-contact-review-highlight-trigger]',
    );
    const starPath = document.querySelector('[data-star-path]');
    const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]');
    const nextButton = document.querySelector('button');
    if (!trigger || !starPath || !tooltip || !nextButton) {
      throw new Error('Invalid review highlight test fixture');
    }

    bindContactReviewHighlightTooltips();
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
    );

    expect(tooltip.hidden).toBe(true);

    starPath.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(tooltip.hidden).toBe(true);

    trigger.dispatchEvent(
      new MouseEvent('mouseout', {
        bubbles: true,
        relatedTarget: document.body,
      }),
    );
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    expect(tooltip.hidden).toBe(false);

    trigger.dispatchEvent(
      new MouseEvent('mouseout', {
        bubbles: true,
        relatedTarget: document.body,
      }),
    );
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
    );

    expect(tooltip.hidden).toBe(true);

    trigger.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: nextButton,
      }),
    );

    expect(tooltip.hidden).toBe(false);
  });
});

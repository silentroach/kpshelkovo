import { describe, expect, it } from 'vitest';

import { installStatusCalendarYearTooltips } from '../year-calendar.dom';

describe('installStatusCalendarYearTooltips', () => {
  it('dismisses a focused tooltip on Escape and resets after focus leaves', () => {
    document.body.innerHTML = `
      <span data-status-calendar-tooltip-root>
        <a href="#day" data-status-calendar-day-link>24</a>
        <span role="tooltip">24 августа: 1 инцидент</span>
      </span>
      <button type="button">После календаря</button>
    `;
    const root = document.querySelector<HTMLElement>(
      '[data-status-calendar-tooltip-root]',
    );
    const link = root?.querySelector<HTMLAnchorElement>('a');
    const button = document.querySelector<HTMLButtonElement>('button');

    if (!root || !link || !button) {
      throw new Error('status calendar tooltip fixture is incomplete');
    }

    installStatusCalendarYearTooltips();
    link.focus();
    link.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    const dismissed = root.hasAttribute('data-tooltip-dismissed');
    button.focus();

    expect({
      dismissed,
      resetAfterBlur: root.hasAttribute('data-tooltip-dismissed'),
    }).toEqual({ dismissed: true, resetAfterBlur: false });
  });
});

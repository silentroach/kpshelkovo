import { describe, expect, it } from 'vitest';

import {
  installStatusCalendarYearInteractions,
  positionStatusCalendarTooltip,
  refreshStatusCalendarToday,
} from '../year-calendar.dom';

const calendarDate = (id: string): string => `
  <span data-status-calendar-date="${id}">
    <time datetime="${id}">${Number(id.slice(-2))}</time>
  </span>
`;

describe('refreshStatusCalendarToday', () => {
  it('moves the marker to the current Moscow date after midnight', () => {
    document.body.innerHTML = `
      ${calendarDate('2026-08-27')}
      ${calendarDate('2026-08-28')}
    `;

    refreshStatusCalendarToday(new Date('2026-08-27T20:59:59.000Z'));
    refreshStatusCalendarToday(new Date('2026-08-27T21:00:00.000Z'));

    expect(
      [...document.querySelectorAll('[data-status-calendar-date]')].map(
        (date) => ({
          id: date.getAttribute('data-status-calendar-date'),
          today: date.getAttribute('data-status-calendar-today'),
          current: date.querySelector('time')?.getAttribute('aria-current'),
        }),
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "current": null,
          "id": "2026-08-27",
          "today": null,
        },
        {
          "current": "date",
          "id": "2026-08-28",
          "today": "2026-08-28",
        },
      ]
    `);
  });
});

describe('positionStatusCalendarTooltip', () => {
  it('shifts long tooltips inside both viewport edges', () => {
    document.body.innerHTML = `
      <span data-status-calendar-tooltip-root>
        <span data-status-calendar-tooltip>Tooltip</span>
      </span>
    `;
    const root = document.querySelector<HTMLElement>(
      '[data-status-calendar-tooltip-root]',
    );
    const tooltip = root?.querySelector<HTMLElement>(
      '[data-status-calendar-tooltip]',
    );

    if (!root || !tooltip) {
      throw new Error('status calendar positioning fixture is incomplete');
    }

    tooltip.getBoundingClientRect = () =>
      ({ left: -40, right: 200 }) as DOMRect;
    positionStatusCalendarTooltip(root, 320);
    const leftShift = tooltip.style.getPropertyValue(
      '--status-calendar-tooltip-shift-x',
    );

    tooltip.getBoundingClientRect = () =>
      ({ left: 100, right: 340 }) as DOMRect;
    positionStatusCalendarTooltip(root, 320);

    expect({
      leftShift,
      rightShift: tooltip.style.getPropertyValue(
        '--status-calendar-tooltip-shift-x',
      ),
    }).toMatchInlineSnapshot(`
      {
        "leftShift": "56px",
        "rightShift": "-36px",
      }
    `);
  });
});

describe('installStatusCalendarYearInteractions', () => {
  it('dismisses focused and hovered tooltips on Escape until they close', () => {
    document.body.innerHTML = `
      <span data-status-calendar-tooltip-root>
        <a href="#day" data-status-calendar-day-link>24</a>
        <span role="tooltip">24 августа: 1 проблема</span>
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

    installStatusCalendarYearInteractions();
    root.dispatchEvent(new Event('pointerover', { bubbles: true }));
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    const dismissedOnHover = root.hasAttribute('data-tooltip-dismissed');
    root.dispatchEvent(
      new MouseEvent('pointerout', {
        bubbles: true,
        relatedTarget: button,
      }),
    );
    const resetAfterPointerLeaves = root.hasAttribute('data-tooltip-dismissed');

    link.focus();
    link.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    const dismissedOnFocus = root.hasAttribute('data-tooltip-dismissed');
    button.focus();
    const resetAfterBlur = root.hasAttribute('data-tooltip-dismissed');

    root.dispatchEvent(new Event('pointerover', { bubbles: true }));
    link.focus();
    link.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    root.dispatchEvent(
      new MouseEvent('pointerout', {
        bubbles: true,
        relatedTarget: button,
      }),
    );
    const dismissedWhileFocused = root.hasAttribute('data-tooltip-dismissed');
    button.focus();
    const resetAfterFocusAndPointerLeave = root.hasAttribute(
      'data-tooltip-dismissed',
    );

    root.dispatchEvent(new Event('pointerover', { bubbles: true }));
    link.focus();
    link.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    button.focus();
    const dismissedWhileHovered = root.hasAttribute('data-tooltip-dismissed');
    root.dispatchEvent(
      new MouseEvent('pointerout', {
        bubbles: true,
        relatedTarget: button,
      }),
    );

    expect({
      dismissedOnHover,
      resetAfterPointerLeaves,
      dismissedOnFocus,
      resetAfterBlur,
      dismissedWhileFocused,
      resetAfterFocusAndPointerLeave,
      dismissedWhileHovered,
      resetAfterBlurAndPointerLeave: root.hasAttribute(
        'data-tooltip-dismissed',
      ),
    }).toMatchInlineSnapshot(`
      {
        "dismissedOnFocus": true,
        "dismissedOnHover": true,
        "dismissedWhileFocused": true,
        "dismissedWhileHovered": true,
        "resetAfterBlur": false,
        "resetAfterBlurAndPointerLeave": false,
        "resetAfterFocusAndPointerLeave": false,
        "resetAfterPointerLeaves": false,
      }
    `);
  });
});

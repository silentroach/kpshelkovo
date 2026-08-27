import { describe, expect, it } from 'vitest';

import { visibleWhitespace } from '@/lib/test/visible-whitespace';

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
  const renderTooltip = () => {
    document.body.innerHTML = `
      <span
        data-status-calendar-tooltip-root="2026-08-24"
        data-status-calendar-tooltip-summary="24 августа 2026: 2 проблемы, 1 плановая работа"
      >
        <a
          href="#2026-08-24"
          aria-label="24 августа 2026: 2 проблемы, 1 плановая работа"
          aria-describedby="status-calendar-tooltip-2026-08-24"
          data-status-calendar-day-link
        >24</a>
        <span
          id="status-calendar-tooltip-2026-08-24"
          role="tooltip"
          aria-label="Откроется журнал за этот день"
          aria-hidden="true"
          data-status-calendar-tooltip
        ><span aria-hidden="true" data-status-calendar-tooltip-text>Fallback</span></span>
      </span>
      <button type="button">После календаря</button>
    `;
    const root = document.querySelector<HTMLElement>(
      '[data-status-calendar-tooltip-root]',
    );
    const link = root?.querySelector<HTMLAnchorElement>('a');
    const tooltip = root?.querySelector<HTMLElement>('[role="tooltip"]');
    const button = document.querySelector<HTMLButtonElement>('button');

    if (!root || !link || !tooltip || !button) {
      throw new Error('status calendar tooltip fixture is incomplete');
    }

    return { root, link, tooltip, button };
  };

  it('opens on mouse hover, remains hoverable, and reopens after Escape', () => {
    const { root, link, tooltip, button } = renderTooltip();

    installStatusCalendarYearInteractions();
    link.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'mouse',
      }),
    );
    const opened = root.hasAttribute('data-status-calendar-tooltip-open');
    link.dispatchEvent(
      new PointerEvent('pointerout', {
        bubbles: true,
        pointerType: 'mouse',
        relatedTarget: tooltip,
      }),
    );
    const openOverTooltip = root.hasAttribute(
      'data-status-calendar-tooltip-open',
    );
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    const closedOnEscape = !root.hasAttribute(
      'data-status-calendar-tooltip-open',
    );
    tooltip.dispatchEvent(
      new PointerEvent('pointerout', {
        bubbles: true,
        pointerType: 'mouse',
        relatedTarget: button,
      }),
    );
    link.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'mouse',
      }),
    );

    expect({
      opened,
      openOverTooltip,
      closedOnEscape,
      reopened: root.hasAttribute('data-status-calendar-tooltip-open'),
      summary: visibleWhitespace(tooltip.textContent),
      ariaHidden: tooltip.getAttribute('aria-hidden'),
    }).toMatchInlineSnapshot(`
      {
        "ariaHidden": "false",
        "closedOnEscape": true,
        "openOverTooltip": true,
        "opened": true,
        "reopened": true,
        "summary": "24·августа·2026: 2·проблемы, 1·плановая работа",
      }
    `);
  });

  it('opens and closes for a pen pointer', () => {
    const { root, link, button } = renderTooltip();

    installStatusCalendarYearInteractions();
    link.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'pen',
      }),
    );
    const opened = root.hasAttribute('data-status-calendar-tooltip-open');
    link.dispatchEvent(
      new PointerEvent('pointerout', {
        bubbles: true,
        pointerType: 'pen',
        relatedTarget: button,
      }),
    );

    expect({
      opened,
      closed: !root.hasAttribute('data-status-calendar-tooltip-open'),
    }).toMatchInlineSnapshot(`
      {
        "closed": true,
        "opened": true,
      }
    `);
  });

  it('opens on keyboard focus and reopens after Escape and blur', () => {
    const { root, link, tooltip, button } = renderTooltip();

    installStatusCalendarYearInteractions();
    link.focus();
    const opened = root.hasAttribute('data-status-calendar-tooltip-open');
    link.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    const closedOnEscape = !root.hasAttribute(
      'data-status-calendar-tooltip-open',
    );
    button.focus();
    link.focus();

    expect({
      opened,
      closedOnEscape,
      reopened: root.hasAttribute('data-status-calendar-tooltip-open'),
      ariaHidden: tooltip.getAttribute('aria-hidden'),
      describedBy: link.getAttribute('aria-describedby'),
    }).toMatchInlineSnapshot(`
      {
        "ariaHidden": "false",
        "closedOnEscape": true,
        "describedBy": "status-calendar-tooltip-2026-08-24",
        "opened": true,
        "reopened": true,
      }
    `);
  });

  it('ignores touch hover, preserves the first click, and inserts text safely', () => {
    const { root, link, tooltip } = renderTooltip();
    const unsafeSummary = '<img src=x onerror="alert(1)">';

    root.dataset.statusCalendarTooltipSummary = unsafeSummary;
    installStatusCalendarYearInteractions();
    link.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'touch',
      }),
    );
    const openAfterTouch = root.hasAttribute(
      'data-status-calendar-tooltip-open',
    );
    const click = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    const clickAllowed = link.dispatchEvent(click);

    link.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'mouse',
      }),
    );

    expect({
      openAfterTouch,
      clickAllowed,
      clickPrevented: click.defaultPrevented,
      text: tooltip.textContent,
      html: tooltip.querySelector('[data-status-calendar-tooltip-text]')
        ?.innerHTML,
      injectedImage: Boolean(tooltip.querySelector('img')),
    }).toMatchInlineSnapshot(`
      {
        "clickAllowed": true,
        "clickPrevented": false,
        "html": "&lt;img src=x onerror=\"alert(1)\"&gt;",
        "injectedImage": false,
        "openAfterTouch": false,
        "text": "<img src=x onerror=\"alert(1)\">",
      }
    `);
  });
});

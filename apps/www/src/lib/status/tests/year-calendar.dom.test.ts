import { afterEach, describe, expect, it, vi } from 'vitest';

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
  const renderTooltip = (year = 2026) => {
    const dayId = `${String(year)}-08-24`;

    document.body.innerHTML = `
      <div data-status-calendar-year="${String(year)}">
        <span
          data-status-calendar-date="${dayId}"
          data-status-calendar-tooltip-root="${dayId}"
          data-status-calendar-tooltip-summary="24 августа ${String(year)}: 2 проблемы, 1 плановая работа"
        >
          <a
            href="#${dayId}"
            aria-label="24 августа ${String(year)}: 2 проблемы, 1 плановая работа"
            aria-describedby="status-calendar-tooltip-${dayId}"
            data-status-calendar-day-link
          >24</a>
          <span
            id="status-calendar-tooltip-${dayId}"
            role="tooltip"
            aria-label="Откроется журнал за этот день"
            aria-hidden="true"
            data-status-calendar-tooltip
          ><span aria-hidden="true" data-status-calendar-tooltip-text>Fallback</span></span>
        </span>
      </div>
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

  afterEach(() => {
    document.dispatchEvent(new Event('astro:before-swap'));
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

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

  it('owns listeners and the minute timer only while a calendar route is active', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T12:00:00.000Z'));
    const clearInterval = vi.spyOn(window, 'clearInterval');
    const firstCalendar = renderTooltip();

    installStatusCalendarYearInteractions();
    const firstTimer = vi.getTimerCount();
    firstCalendar.link.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'mouse',
      }),
    );

    document.dispatchEvent(new Event('astro:before-swap'));
    document.body.innerHTML =
      '<main><button type="button">Обычная страница</button></main>';
    document.dispatchEvent(new Event('astro:page-load'));

    const closest = vi.spyOn(Element.prototype, 'closest');
    const querySelectorAll = vi.spyOn(document, 'querySelectorAll');
    document.querySelector('button')?.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'mouse',
      }),
    );
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
    );
    vi.advanceTimersByTime(120_000);
    document.dispatchEvent(new Event('astro:page-load'));

    const workOutsideCalendar = {
      tooltipLookups: closest.mock.calls.filter(
        ([selector]) => selector === '[data-status-calendar-tooltip-root]',
      ).length,
      todayRefreshes: querySelectorAll.mock.calls.filter(([selector]) =>
        String(selector).includes('[data-status-calendar-today]'),
      ).length,
      timers: vi.getTimerCount(),
    };

    document.dispatchEvent(new Event('astro:before-swap'));
    vi.setSystemTime(new Date('2027-08-24T12:00:00.000Z'));
    const returnedCalendar = renderTooltip(2027);
    const tooltipBounds = vi
      .spyOn(returnedCalendar.tooltip, 'getBoundingClientRect')
      .mockReturnValue({ left: 20, right: 200 } as DOMRect);
    document.dispatchEvent(new Event('astro:page-load'));
    document.dispatchEvent(new Event('astro:page-load'));
    returnedCalendar.link.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'mouse',
      }),
    );

    expect({
      firstTimer,
      openedInitially: firstCalendar.root.hasAttribute(
        'data-status-calendar-tooltip-open',
      ),
      clearedTimers: clearInterval.mock.calls.length,
      workOutsideCalendar,
      timersAfterReturn: vi.getTimerCount(),
      listenerCallsAfterReturn: tooltipBounds.mock.calls.length,
      openedAfterReturn: returnedCalendar.root.hasAttribute(
        'data-status-calendar-tooltip-open',
      ),
      todayAfterReturn: returnedCalendar.root.dataset.statusCalendarToday,
    }).toMatchInlineSnapshot(`
      {
        "clearedTimers": 2,
        "firstTimer": 1,
        "listenerCallsAfterReturn": 1,
        "openedAfterReturn": true,
        "openedInitially": true,
        "timersAfterReturn": 1,
        "todayAfterReturn": "2027-08-24",
        "workOutsideCalendar": {
          "timers": 0,
          "todayRefreshes": 0,
          "tooltipLookups": 0,
        },
      }
    `);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import { visibleWhitespace } from '@/lib/test/visible-whitespace';

import {
  positionStatusCalendarTooltip,
  refreshStatusCalendarToday,
  registerStatusCalendarYearInteractions,
} from '../year-calendar.dom';

const calendarDate = (id: string): string => `
  <span data-status-calendar-date="${id}">
    <time datetime="${id}">${Number(id.slice(-2))}</time>
  </span>
`;

describe('refreshStatusCalendarToday', () => {
  it('replaces a stale marker with the current Moscow date on initialization', () => {
    document.body.innerHTML = `
      ${calendarDate('2026-08-27')}
      ${calendarDate('2026-08-28')}
    `;
    const staleToday = document.querySelector<HTMLElement>(
      '[data-status-calendar-date="2026-08-27"]',
    );
    if (!staleToday) {
      throw new Error('status calendar today fixture is incomplete');
    }

    staleToday.classList.add('status-calendar-date--today');
    staleToday.dataset.statusCalendarToday = '2026-08-27';
    staleToday.querySelector('time')?.setAttribute('aria-current', 'date');
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

describe('registerStatusCalendarYearInteractions', () => {
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
      <status-year-calendar-lifecycle hidden></status-year-calendar-lifecycle>
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
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('opens on mouse hover, remains hoverable, and reopens after Escape', () => {
    const { root, link, tooltip, button } = renderTooltip();

    registerStatusCalendarYearInteractions();
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

    registerStatusCalendarYearInteractions();
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

    registerStatusCalendarYearInteractions();
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
    registerStatusCalendarYearInteractions();
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

  it('initializes each calendar DOM once and stops work after disconnect', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-24T12:00:00.000Z'));
    registerStatusCalendarYearInteractions();
    const querySelectorAll = vi.spyOn(Element.prototype, 'querySelectorAll');
    const firstCalendar = renderTooltip();

    firstCalendar.link.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'mouse',
      }),
    );
    const firstTodayInitializations = querySelectorAll.mock.calls.filter(
      ([selector]) =>
        selector ===
        '[data-status-calendar-today], .status-calendar-date--today',
    ).length;

    document.body.innerHTML = `
      <main>
        <span
          data-status-calendar-tooltip-root
          data-status-calendar-tooltip-summary="Обычная страница"
        >
          <button type="button">Обычная страница</button>
          <span aria-hidden="true" data-status-calendar-tooltip>
            <span data-status-calendar-tooltip-text>Fallback</span>
          </span>
        </span>
      </main>
    `;
    querySelectorAll.mockClear();
    const outsideRoot = document.querySelector<HTMLElement>(
      '[data-status-calendar-tooltip-root]',
    );
    const outsideButton = outsideRoot?.querySelector('button');
    if (!outsideRoot || !outsideButton) {
      throw new Error('non-calendar fixture is incomplete');
    }

    outsideButton.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'mouse',
      }),
    );
    outsideButton.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    const openedOutsideCalendar = outsideRoot.hasAttribute(
      'data-status-calendar-tooltip-open',
    );
    outsideRoot.setAttribute('data-status-calendar-tooltip-open', '');
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
    );
    document.dispatchEvent(new Event('astro:page-load'));
    const todayInitializationsOutsideCalendar =
      querySelectorAll.mock.calls.filter(
        ([selector]) =>
          selector ===
          '[data-status-calendar-today], .status-calendar-date--today',
      ).length;

    querySelectorAll.mockClear();
    vi.setSystemTime(new Date('2027-08-24T12:00:00.000Z'));
    const returnedCalendar = renderTooltip(2027);
    const tooltipBounds = vi
      .spyOn(returnedCalendar.tooltip, 'getBoundingClientRect')
      .mockReturnValue({ left: 20, right: 200 } as DOMRect);
    registerStatusCalendarYearInteractions();
    registerStatusCalendarYearInteractions();
    document.dispatchEvent(new Event('astro:page-load'));
    document.dispatchEvent(new Event('astro:page-load'));
    returnedCalendar.link.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'mouse',
      }),
    );
    const returnedTodayInitializations = querySelectorAll.mock.calls.filter(
      ([selector]) =>
        selector ===
        '[data-status-calendar-today], .status-calendar-date--today',
    ).length;

    expect({
      firstTodayInitializations,
      openedInitially: firstCalendar.root.hasAttribute(
        'data-status-calendar-tooltip-open',
      ),
      openedOutsideCalendar,
      keptOpenAfterOutsideEscape: outsideRoot.hasAttribute(
        'data-status-calendar-tooltip-open',
      ),
      todayInitializationsOutsideCalendar,
      returnedTodayInitializations,
      listenerCallsAfterReturn: tooltipBounds.mock.calls.length,
      openedAfterReturn: returnedCalendar.root.hasAttribute(
        'data-status-calendar-tooltip-open',
      ),
      todayAfterReturn: returnedCalendar.root.dataset.statusCalendarToday,
    }).toMatchInlineSnapshot(`
      {
        "firstTodayInitializations": 1,
        "keptOpenAfterOutsideEscape": true,
        "listenerCallsAfterReturn": 1,
        "openedAfterReturn": true,
        "openedInitially": true,
        "openedOutsideCalendar": false,
        "returnedTodayInitializations": 1,
        "todayAfterReturn": "2027-08-24",
        "todayInitializationsOutsideCalendar": 0,
      }
    `);
  });
});

// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { visibleWhitespace } from '../test/visible-whitespace';
import type { StatusService } from './schema';
import { hydrateStatusTimeline, hydrateStatusTimelines } from './timeline.dom';
import { bindStatusTimelineLazyHydration } from './timeline.lazy';

interface TooltipInput {
  readonly serviceLabel: string;
  readonly kindLabel: string;
  readonly title: string;
  readonly phaseLabel: string;
  readonly phaseIcon?: 'alert' | 'check';
  readonly periodLabel: string;
}

const AREA_TEMPLATES = `
  <div data-status-tooltip-area-templates hidden>
    <span data-status-tooltip-area-template="river"><span role="img">river</span></span>
    <span data-status-tooltip-area-template="forest"><span role="img">forest</span></span>
    <span data-status-tooltip-area-template="park"><span role="img">park</span></span>
    <span data-status-tooltip-area-template="village"><span role="img">village</span></span>
  </div>
`;

interface ProblemNodeInput {
  readonly id: string;
  readonly kind?: 'incident' | 'maintenance';
  readonly service?: StatusService;
  readonly tag?: 'a' | 'button';
  readonly start: string;
  readonly end?: string;
  readonly hidden?: boolean;
  readonly tone?: 'amber' | 'red';
  readonly tooltip?: Partial<TooltipInput>;
}

const escapeAttribute = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const buildTooltip = (
  id: string,
  tooltip?: Partial<TooltipInput>,
): TooltipInput => ({
  serviceLabel: 'Вода',
  kindLabel: 'Инцидент',
  title: `Запись ${id}`,
  phaseLabel: 'идет',
  phaseIcon: 'alert',
  periodLabel: 'Начиная с 8 мая, 07:32',
  ...tooltip,
});

const buildTooltipLabel = (tooltip: TooltipInput): string =>
  [
    tooltip.serviceLabel,
    tooltip.kindLabel,
    tooltip.title,
    `Статус: ${tooltip.phaseLabel}`,
    tooltip.periodLabel,
  ].join('. ');

const renderTimeline = (
  nodes: readonly ProblemNodeInput[],
  rangeDays = 10,
): HTMLElement => {
  document.body.innerHTML = `
    <div data-status-timeline data-range-days="${String(rangeDays)}">
      <div data-status-timeline-track>
        ${nodes
          .map(
            ({
              end,
              hidden = false,
              id,
              kind = 'incident',
              service = 'water',
              start,
              tag = 'a',
              tone = 'red',
              tooltip: rawTooltip,
            }) => {
              const tooltip = buildTooltip(id, rawTooltip);
              const segmentAttributes = `
                ${tag === 'a' ? `href="/status/incidents/${id}"` : 'type="button"'}
                title="${escapeAttribute(buildTooltipLabel(tooltip))}"
                data-incident-id="${id}"
                data-status-problem
                data-status-kind="${kind}"
                data-status-service="${service}"
                data-start="${start}"
                ${end ? `data-end="${end}"` : ''}
                data-tooltip-service-label="${escapeAttribute(tooltip.serviceLabel)}"
                data-tooltip-kind-label="${escapeAttribute(tooltip.kindLabel)}"
                data-tooltip-title="${escapeAttribute(tooltip.title)}"
                data-tooltip-phase-label="${escapeAttribute(tooltip.phaseLabel)}"
                ${tooltip.phaseIcon ? `data-tooltip-phase-icon="${tooltip.phaseIcon}"` : ''}
                data-tooltip-period-label="${escapeAttribute(tooltip.periodLabel)}"
                class="status-service-timeline__segment status-service-timeline__segment--problem status-service-timeline__segment--${tone}"
                ${hidden ? 'hidden' : ''}
              `;

              return `
              <${tag}${segmentAttributes}></${tag}>
            `;
            },
          )
          .join('')}
      </div>
      <div
        id="status-service-timeline-tooltip-test"
        data-status-timeline-tooltip
        role="tooltip"
        aria-hidden="true"
        hidden
      >
        <p>
          <span
            class="status-service-timeline__tooltip-phase-icon status-service-timeline__tooltip-phase-icon--alert"
            data-status-tooltip-phase-icon-alert
            hidden
          ></span>
          <span
            class="status-service-timeline__tooltip-phase-icon status-service-timeline__tooltip-phase-icon--check"
            data-status-tooltip-phase-icon-check
            hidden
          ></span>
          <span data-status-tooltip-title></span>
          <span data-status-tooltip-title-areas hidden></span>
        </p>
        <p data-status-tooltip-period></p>
        <div data-status-tooltip-list hidden></div>
        ${AREA_TEMPLATES}
      </div>
    </div>
  `;

  return document.querySelector('[data-status-timeline]') as HTMLElement;
};

const getGreenSegments = (): HTMLElement[] =>
  Array.from(
    document.querySelectorAll('[data-status-segment="green"]'),
  ) as HTMLElement[];

const getProblemNode = (id: string): HTMLElement =>
  document.querySelector(`[data-incident-id="${id}"]`) as HTMLElement;

const getTooltip = (): HTMLElement =>
  document.querySelector('[data-status-timeline-tooltip]') as HTMLElement;

const getTooltipField = (selector: string): HTMLElement =>
  getTooltip().querySelector(selector) as HTMLElement;

const flushPromises = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const readSegmentMetric = (
  element: HTMLElement,
  name: '--segment-left' | '--segment-width',
): number => Number(element.style.getPropertyValue(name));

const mockRect = (
  element: Element,
  rect: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  },
): void => {
  const value = {
    x: rect.left,
    y: rect.top,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON: () => '',
  } satisfies DOMRect;

  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => value,
  });
};

const mockSize = (
  element: HTMLElement,
  size: { readonly width: number; readonly height: number },
): void => {
  Object.defineProperty(element, 'offsetWidth', {
    configurable: true,
    get: () => size.width,
  });
  Object.defineProperty(element, 'offsetHeight', {
    configurable: true,
    get: () => size.height,
  });
};

afterEach(() => {
  document.body.innerHTML = '';
  delete window.__STATUS_TIMELINE_NOW__;
});

describe('hydrateStatusTimeline', () => {
  it('hides a problem segment that has fallen out of the client-side window', () => {
    const root = renderTimeline([
      {
        id: 'expired',
        start: '2026-05-01T00:00:00Z',
        end: '2026-05-02T00:00:00Z',
      },
    ]);

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-05-15T00:00:00Z'),
    });

    expect(getProblemNode('expired').hidden).toBe(true);
    expect(getGreenSegments()).toHaveLength(1);
    expect(
      readSegmentMetric(getGreenSegments()[0]!, '--segment-left'),
    ).toBeCloseTo(0);
    expect(
      readSegmentMetric(getGreenSegments()[0]!, '--segment-width'),
    ).toBeCloseTo(100);
  });

  it('clips an active problem without end date to the client-side now', () => {
    const root = renderTimeline([
      {
        id: 'active',
        start: '2026-05-08T00:00:00Z',
      },
    ]);

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-05-10T00:00:00Z'),
    });

    const node = getProblemNode('active');

    expect(node.hidden).toBe(false);
    expect(readSegmentMetric(node, '--segment-left')).toBeCloseTo(80);
    expect(readSegmentMetric(node, '--segment-width')).toBeCloseTo(20);
  });

  it('shows a hidden future problem node once it enters the client-side window', () => {
    const root = renderTimeline([
      {
        id: 'future',
        kind: 'maintenance',
        start: '2026-05-12T00:00:00Z',
        end: '2026-05-13T00:00:00Z',
        tone: 'amber',
        hidden: true,
        tooltip: {
          kindLabel: 'Плановые работы',
          phaseLabel: 'запланировано',
        },
      },
    ]);

    expect(getProblemNode('future').hidden).toBe(true);

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-05-15T00:00:00Z'),
    });

    const node = getProblemNode('future');

    expect(node.hidden).toBe(false);
    expect(node.dataset.tooltipPhaseLabel).toBe('завершено');
    expect(node.getAttribute('aria-label')).toContain('Статус: завершено');
    expect(readSegmentMetric(node, '--segment-left')).toBeCloseTo(70);
    expect(readSegmentMetric(node, '--segment-width')).toBeCloseTo(10);
  });

  it('recomputes dense lanes when a hidden future marker becomes visible', () => {
    const root = renderTimeline(
      [
        {
          id: 'electricity-outage-2026-08-06',
          start: '2026-08-06T09:25:00Z',
          end: '2026-08-06T09:47:00Z',
        },
        {
          id: 'electricity-river-outage-2026-08-10',
          kind: 'maintenance',
          start: '2026-08-10T12:00:00Z',
          end: '2026-08-10T14:00:00Z',
          tone: 'amber',
        },
        {
          id: 'electricity-outage-2026-08-11',
          kind: 'maintenance',
          start: '2026-08-11T06:00:00Z',
          end: '2026-08-11T14:00:00Z',
          hidden: true,
          tone: 'amber',
        },
      ],
      90,
    );
    const ids = [
      'electricity-outage-2026-08-06',
      'electricity-river-outage-2026-08-10',
      'electricity-outage-2026-08-11',
    ] as const;
    const readLayout = () => ({
      offsets: ids.map((id) =>
        getProblemNode(id).style.getPropertyValue('--segment-lane-offset'),
      ),
      hidden: ids.map((id) => getProblemNode(id).hidden),
      space: root.style.getPropertyValue('--timeline-lane-space'),
    });

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-08-10T18:00:00Z'),
    });

    expect(readLayout()).toMatchInlineSnapshot(`
      {
        "hidden": [
          false,
          false,
          true,
        ],
        "offsets": [
          "-12px",
          "12px",
          "",
        ],
        "space": "12px",
      }
    `);

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-08-12T00:00:00Z'),
    });

    expect(readLayout()).toMatchInlineSnapshot(`
      {
        "hidden": [
          false,
          false,
          false,
        ],
        "offsets": [
          "-24px",
          "24px",
          "0px",
        ],
        "space": "24px",
      }
    `);
  });

  it('adds green stable gaps before, between, and after problem segments', () => {
    const root = renderTimeline([
      {
        id: 'first',
        start: '2026-05-02T00:00:00Z',
        end: '2026-05-03T00:00:00Z',
      },
      {
        id: 'second',
        start: '2026-05-05T00:00:00Z',
        end: '2026-05-07T00:00:00Z',
      },
    ]);

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-05-10T00:00:00Z'),
    });

    const green = getGreenSegments();

    expect(green).toHaveLength(3);
    expect(readSegmentMetric(green[0]!, '--segment-left')).toBeCloseTo(0);
    expect(readSegmentMetric(green[0]!, '--segment-width')).toBeCloseTo(20);
    expect(readSegmentMetric(green[1]!, '--segment-left')).toBeCloseTo(30);
    expect(readSegmentMetric(green[1]!, '--segment-width')).toBeCloseTo(20);
    expect(readSegmentMetric(green[2]!, '--segment-left')).toBeCloseTo(70);
    expect(readSegmentMetric(green[2]!, '--segment-width')).toBeCloseTo(30);
  });

  it('does not create a false green gap between overlapping problems', () => {
    const root = renderTimeline([
      {
        id: 'overlap-a',
        start: '2026-05-02T00:00:00Z',
        end: '2026-05-05T00:00:00Z',
      },
      {
        id: 'overlap-b',
        start: '2026-05-04T00:00:00Z',
        end: '2026-05-06T00:00:00Z',
      },
    ]);

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-05-10T00:00:00Z'),
    });

    const green = getGreenSegments();

    expect(green).toHaveLength(2);
    expect(readSegmentMetric(green[0]!, '--segment-width')).toBeCloseTo(20);
    expect(readSegmentMetric(green[1]!, '--segment-left')).toBeCloseTo(60);
    expect(readSegmentMetric(green[1]!, '--segment-width')).toBeCloseTo(40);
  });

  it('remains idempotent when hydration runs multiple times', () => {
    const root = renderTimeline([
      {
        id: 'single',
        start: '2026-05-02T00:00:00Z',
        end: '2026-05-03T00:00:00Z',
      },
    ]);

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-05-10T00:00:00Z'),
    });
    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-05-10T00:00:00Z'),
    });

    expect(getGreenSegments()).toHaveLength(2);
  });

  it('opens and closes the shared tooltip on hover', () => {
    const root = renderTimeline([
      {
        id: 'hover',
        start: '2026-05-08T00:00:00Z',
        end: '2026-05-09T00:00:00Z',
        tooltip: {
          serviceLabel: 'Электричество',
          kindLabel: 'Инцидент',
          title: 'Отключение электричества',
          phaseLabel: 'восстановлено',
          phaseIcon: 'check',
          periodLabel: '22 апреля, 19:30 - 23 апреля, 00:00 (4 ч. 30 мин.)',
        },
      },
    ]);

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-05-10T00:00:00Z'),
    });

    const node = getProblemNode('hover');
    const tooltip = getTooltip();

    node.dispatchEvent(new Event('mouseenter'));

    expect(tooltip.hidden).toBe(false);
    expect(root.dataset.statusTooltipOpen).toBe('true');
    expect(node.getAttribute('aria-describedby')).toBe(tooltip.id);
    expect(getTooltipField('[data-status-tooltip-title]').textContent).toBe(
      'Отключение электричества',
    );
    expect(
      getTooltipField('[data-status-tooltip-phase-icon-check]').hidden,
    ).toBe(false);

    node.dispatchEvent(new Event('mouseleave'));

    expect(tooltip.hidden).toBe(true);
    expect(root.dataset.statusTooltipOpen).toBeUndefined();
    expect(node.hasAttribute('aria-describedby')).toBe(false);
  });

  it('keeps service-specific completed incident phase labels after hydration', () => {
    const root = renderTimeline([
      {
        id: 'dam',
        service: 'dam',
        start: '2026-05-01T00:00:00Z',
        end: '2026-05-02T00:00:00Z',
        tooltip: {
          serviceLabel: 'Дамба',
          title: 'Проезд через дамбу закрыт',
          phaseLabel: 'проезд открыт',
          phaseIcon: 'check',
          periodLabel: '1 мая - 2 мая',
        },
      },
    ]);

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-05-10T00:00:00Z'),
    });

    const node = getProblemNode('dam');

    expect(node.dataset.tooltipPhaseLabel).toBe('проезд открыт');
    expect(node.getAttribute('aria-label')).toContain('Статус: проезд открыт');
  });

  it('opens on focus and closes on focusout and Escape', () => {
    const root = renderTimeline([
      {
        id: 'focus',
        tag: 'button',
        start: '2026-05-08T00:00:00Z',
      },
    ]);

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-05-10T00:00:00Z'),
    });

    const node = getProblemNode('focus');
    const tooltip = getTooltip();

    node.dispatchEvent(new FocusEvent('focusin'));
    expect(tooltip.hidden).toBe(false);

    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(tooltip.hidden).toBe(true);

    node.dispatchEvent(new FocusEvent('focusin'));
    node.dispatchEvent(new FocusEvent('focusout'));
    expect(tooltip.hidden).toBe(true);
  });

  it('opens on touchstart after hydration', () => {
    const root = renderTimeline([
      {
        id: 'touch',
        tag: 'button',
        start: '2026-05-08T00:00:00Z',
      },
    ]);

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-05-10T00:00:00Z'),
    });

    const node = getProblemNode('touch');
    const tooltip = getTooltip();

    node.dispatchEvent(new Event('touchstart'));

    expect(tooltip.hidden).toBe(false);
    expect(node.getAttribute('aria-describedby')).toBe(tooltip.id);
  });

  it('removes the native title after hydration to avoid double tooltips', () => {
    const root = renderTimeline([
      {
        id: 'title',
        start: '2026-05-08T00:00:00Z',
      },
    ]);

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-05-10T00:00:00Z'),
    });

    expect(getProblemNode('title').getAttribute('title')).toBeNull();
  });

  it('fills tooltip text from data attributes without injecting HTML', () => {
    const root = renderTimeline([
      {
        id: 'safe',
        start: '2026-05-08T00:00:00Z',
        tooltip: {
          title: '<strong>Опасно</strong>',
        },
      },
    ]);

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-05-10T00:00:00Z'),
    });

    getProblemNode('safe').dispatchEvent(new Event('mouseenter'));

    expect(getTooltipField('[data-status-tooltip-title]').textContent).toBe(
      '<strong>Опасно</strong>',
    );
    expect(getTooltipField('[data-status-tooltip-title]').innerHTML).toBe(
      '&lt;strong&gt;Опасно&lt;/strong&gt;',
    );
  });

  it('renders grouped tooltip entries as stacked single-record blocks', () => {
    document.body.innerHTML = `
      <div data-status-timeline data-range-days="10">
        <div data-status-timeline-track>
          <a
            href="/status/incidents/grouped"
            title="Электричество. 3 события за 9 мая"
            aria-label="Электричество. 3 события за 9 мая"
            data-incident-id="grouped"
            data-status-problem
            data-start="2026-05-09T03:00:00Z"
            data-end="2026-05-09T20:05:00Z"
            data-tooltip-service-label="Электричество"
            data-tooltip-group-title="3 события за 9 мая"
            data-tooltip-items='[{"kind":"incident","title":"Отключение 1","isActive":false,"startedIso":"2026-05-09T03:00:00Z","startedHasTime":true,"endedIso":"2026-05-09T03:40:00Z","endedHasTime":true,"duration":{"totalMinutes":40}},{"kind":"incident","title":"Отключение 2","isActive":false,"startedIso":"2026-05-09T08:10:00Z","startedHasTime":true,"endedIso":"2026-05-09T08:45:00Z","endedHasTime":true,"duration":{"totalMinutes":35}},{"kind":"incident","title":"Отключение 3","isActive":true,"startedIso":"2026-05-09T19:20:00Z","startedHasTime":true,"endedHasTime":false}]'
            class="status-service-timeline__segment status-service-timeline__segment--problem status-service-timeline__segment--red"
          ></a>
        </div>
        <div
          id="status-service-timeline-tooltip-grouped"
          data-status-timeline-tooltip
          role="tooltip"
          aria-hidden="true"
          hidden
        >
          <p>
            <span
              class="status-service-timeline__tooltip-phase-icon status-service-timeline__tooltip-phase-icon--alert"
              data-status-tooltip-phase-icon-alert
              hidden
            ></span>
            <span
              class="status-service-timeline__tooltip-phase-icon status-service-timeline__tooltip-phase-icon--check"
              data-status-tooltip-phase-icon-check
              hidden
             ></span>
             <span data-status-tooltip-title></span>
             <span data-status-tooltip-title-areas hidden></span>
           </p>
           <p data-status-tooltip-period></p>
           <div data-status-tooltip-list hidden></div>
           ${AREA_TEMPLATES}
         </div>
      </div>
    `;

    const root = document.querySelector(
      '[data-status-timeline]',
    ) as HTMLElement;

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-05-10T00:00:00Z'),
    });

    getProblemNode('grouped').dispatchEvent(new Event('mouseenter'));

    expect(getTooltipField('[data-status-tooltip-title]').hidden).toBe(true);
    expect(getTooltipField('[data-status-tooltip-period]').hidden).toBe(true);
    expect(
      String(
        visibleWhitespace(
          getTooltipField('[data-status-tooltip-list]').textContent,
        ),
      )
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n'),
    ).toMatchInlineSnapshot(`
      "Отключение·1
      9·мая, 06:00·—·06:40 (40·мин.)
      Отключение·2
      9·мая, 11:10·—·11:45 (35·мин.)
      Отключение·3
      Начиная с·9·мая, 22:20"
    `);
    const firstTitleText = getTooltipField('[data-status-tooltip-list]')
      .firstElementChild?.firstElementChild as HTMLElement | undefined;

    expect(String(visibleWhitespace(firstTitleText?.textContent)).trim()).toBe(
      'Отключение·1',
    );
    expect(firstTitleText?.hidden).toBe(false);
    expect(
      getTooltipField('[data-status-tooltip-list]').querySelectorAll(
        '.status-service-timeline__tooltip-phase-icon--check:not([hidden])',
      ),
    ).toHaveLength(2);
    expect(
      getTooltipField('[data-status-tooltip-list]').querySelectorAll(
        '.status-service-timeline__tooltip-phase-icon--alert:not([hidden])',
      ),
    ).toHaveLength(1);
  });

  it('clamps tooltip position within the component width', () => {
    const root = renderTimeline([
      {
        id: 'clamp',
        start: '2026-05-08T00:00:00Z',
      },
    ]);

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-05-10T00:00:00Z'),
    });

    const node = getProblemNode('clamp');
    const tooltip = getTooltip();

    mockRect(root, { left: 100, top: 120, width: 300, height: 16 });
    mockRect(node, { left: 120, top: 123, width: 8, height: 10 });
    mockSize(tooltip, { width: 180, height: 120 });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 900,
    });

    node.dispatchEvent(new Event('mouseenter'));

    expect(tooltip.style.left).toBe('98px');
    expect(tooltip.dataset.side).toBe('below');
  });

  it('flips the tooltip above for lower rows when there is not enough space below', () => {
    const root = renderTimeline([
      {
        id: 'above',
        start: '2026-05-08T00:00:00Z',
      },
    ]);

    hydrateStatusTimeline(root, {
      nowMs: Date.parse('2026-05-10T00:00:00Z'),
    });

    const node = getProblemNode('above');
    const tooltip = getTooltip();

    mockRect(root, { left: 100, top: 160, width: 320, height: 16 });
    mockRect(node, { left: 250, top: 164, width: 10, height: 10 });
    mockSize(tooltip, { width: 220, height: 140 });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 220,
    });

    node.dispatchEvent(new Event('mouseenter'));

    expect(tooltip.dataset.side).toBe('above');
  });

  it('uses deterministic now overrides and exits softly on incomplete DOM', () => {
    document.body.innerHTML = `
      <section>
        <div data-status-timeline data-range-days="10">
          <div data-status-timeline-track>
            <a
              href="/status/incidents/scoped"
              title="Вода. Инцидент. Scoped. Статус: идет. Начиная с 8 мая, 07:32"
              data-incident-id="scoped"
              data-status-problem
              data-start="2026-05-08T00:00:00Z"
              data-tooltip-service-label="Вода"
              data-tooltip-kind-label="Инцидент"
              data-tooltip-title="Scoped"
              data-tooltip-phase-label="идет"
              data-tooltip-phase-icon="alert"
              data-tooltip-period-label="Начиная с 8 мая, 07:32"
              class="status-service-timeline__segment status-service-timeline__segment--problem status-service-timeline__segment--red"
            ></a>
          </div>
          <div
            id="status-service-timeline-tooltip-scoped"
            data-status-timeline-tooltip
            role="tooltip"
            aria-hidden="true"
            hidden
          >
             <p>
               <span
                 class="status-service-timeline__tooltip-phase-icon status-service-timeline__tooltip-phase-icon--alert"
                 data-status-tooltip-phase-icon-alert
                 hidden
               ></span>
               <span
                 class="status-service-timeline__tooltip-phase-icon status-service-timeline__tooltip-phase-icon--check"
                 data-status-tooltip-phase-icon-check
                 hidden
                ></span>
                <span data-status-tooltip-title></span>
                <span data-status-tooltip-title-areas hidden></span>
              </p>
              <p data-status-tooltip-period></p>
              <div data-status-tooltip-list hidden></div>
              ${AREA_TEMPLATES}
            </div>
         </div>
         <div data-status-timeline data-range-days="10"></div>
       </section>
     `;

    window.__STATUS_TIMELINE_NOW__ = Date.parse('2026-05-10T00:00:00Z');

    expect(() => hydrateStatusTimelines(document)).not.toThrow();

    const scoped = getProblemNode('scoped');

    expect(readSegmentMetric(scoped, '--segment-left')).toBeCloseTo(80);
    expect(readSegmentMetric(scoped, '--segment-width')).toBeCloseTo(20);

    hydrateStatusTimelines(document, {
      nowMs: Date.parse('2026-05-09T00:00:00Z'),
    });

    expect(readSegmentMetric(scoped, '--segment-left')).toBeCloseTo(90);
    expect(readSegmentMetric(scoped, '--segment-width')).toBeCloseTo(10);
  });
});

describe('bindStatusTimelineLazyHydration', () => {
  const renderLazyTimelineDocument = (): Document => {
    const rootDocument = document.implementation.createHTMLDocument();

    rootDocument.body.innerHTML = `
      <button data-outside-status-timeline>Outside</button>
      <div data-status-timeline data-range-days="10">
        <div data-status-timeline-track>
          <button type="button" data-status-problem data-incident-id="lazy"></button>
        </div>
      </div>
    `;

    return rootDocument;
  };

  const getLazyProblemNode = (rootDocument: Document): HTMLElement =>
    rootDocument.querySelector('[data-status-problem]') as HTMLElement;

  it('keeps the full DOM module unloaded until a timeline segment interaction', async () => {
    const rootDocument = renderLazyTimelineDocument();
    const hydrateStatusTimelines = vi.fn();
    const loadStatusTimelineDom = vi.fn(async () => ({
      hydrateStatusTimelines,
    }));

    bindStatusTimelineLazyHydration(rootDocument, loadStatusTimelineDom);

    rootDocument
      .querySelector('[data-outside-status-timeline]')
      ?.dispatchEvent(new Event('pointerover', { bubbles: true }));
    await flushPromises();

    expect(loadStatusTimelineDom).not.toHaveBeenCalled();

    getLazyProblemNode(rootDocument).dispatchEvent(
      new Event('pointerover', { bubbles: true }),
    );
    await flushPromises();

    expect(loadStatusTimelineDom).toHaveBeenCalledTimes(1);
    expect(hydrateStatusTimelines).toHaveBeenCalledWith(rootDocument);
  });

  it.each([
    ['pointerover', 'mouseenter'],
    ['focusin', 'focusin'],
    ['touchstart', 'touchstart'],
  ] as const)(
    'replays the first %s intent after lazy hydration',
    async (sourceEvent, replayedEvent) => {
      const rootDocument = renderLazyTimelineDocument();
      const trigger = getLazyProblemNode(rootDocument);
      const hydrateStatusTimelines = vi.fn((scope?: ParentNode) => {
        const node = scope?.querySelector('[data-status-problem]');

        if (!(node instanceof HTMLElement)) {
          return;
        }

        node.addEventListener(replayedEvent, () => {
          node.dataset.replayedEvent = replayedEvent;
        });
      });
      const loadStatusTimelineDom = vi.fn(async () => ({
        hydrateStatusTimelines,
      }));

      bindStatusTimelineLazyHydration(rootDocument, loadStatusTimelineDom);
      trigger.dispatchEvent(new Event(sourceEvent, { bubbles: true }));
      await flushPromises();

      expect(trigger.dataset.replayedEvent).toBe(replayedEvent);
    },
  );
});

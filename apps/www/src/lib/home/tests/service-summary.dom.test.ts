import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import {
  hydrateHomeServiceSummary,
  installHomeServiceSummary
} from '@/lib/home/service-summary.dom';

const START = Date.parse('2026-10-06T21:30:00Z');
const END = Date.parse('2026-10-07T00:30:00Z');
const NEXT = Date.parse('2026-10-08T21:30:00Z');
const SERVICES = ['electricity', 'water', 'internet', 'dam'] as const;
const PAYLOAD = JSON.stringify([
  { service: 'electricity', windows: [{ kind: 'maintenance', start: START, end: END }] }
]);

const getSummary = (): HTMLElement =>
  document.querySelector('[data-home-service-summary]') as HTMLElement;

const getLinks = (root: ParentNode = document): readonly HTMLAnchorElement[] =>
  Array.from(root.querySelectorAll<HTMLAnchorElement>('a[data-home-service]'));

const readMessages = (root: ParentNode = document) =>
  getLinks(root)
    .filter((link) => !link.hidden)
    .map((link) => ({
      service: link.dataset.homeService,
      phase: link.dataset.phase,
      kind: link.dataset.kind,
      label: link.querySelector('[data-home-service-label]')?.textContent
    }));

const renderSummary = (payload = PAYLOAD): void => {
  document.body.innerHTML = `
    <section data-home-service-summary aria-label="Services">
      <div data-home-service-list>
        ${SERVICES.map(
          (service) => `
            <a href="/status/${service}/" data-home-service="${service}"
              data-phase="scheduled" data-kind="maintenance"
              ${service === 'electricity' ? '' : 'hidden'}>
              <span>${service}</span>
              <span data-home-service-label>Build snapshot</span>
            </a>`
        ).join('')}
      </div>
    </section>
    <script type="application/json" data-home-service-windows>${payload}</script>
  `;
};

const subscriptions = vi.spyOn(document, 'addEventListener');

afterEach(() => {
  for (const [event, listener, options] of subscriptions.mock.calls) {
    document.removeEventListener(event, listener, options);
  }
  subscriptions.mockClear();
  document.body.innerHTML = '';
  delete window.__shelkovoHomeServiceSummaryHydration;
  vi.useRealTimers();
});

afterAll(() => subscriptions.mockRestore());

describe('hydrateHomeServiceSummary', () => {
  it.each([
    { name: 'finite windows', end: END },
    { name: 'windows without an end', end: undefined }
  ])('turns announcements into active events at their start: $name', ({ end }) => {
    renderSummary(
      JSON.stringify([
        { service: 'electricity', windows: [{ kind: 'maintenance', start: START, end }] },
        { service: 'water', windows: [{ kind: 'incident', start: START, end }] }
      ])
    );

    hydrateHomeServiceSummary(document.body, START - 1);
    expect(readMessages()).toMatchInlineSnapshot(`
      [
        {
          "kind": "maintenance",
          "label": "Работы с 7 октября",
          "phase": "scheduled",
          "service": "electricity",
        },
        {
          "kind": "incident",
          "label": "Перебой с 7 октября",
          "phase": "scheduled",
          "service": "water",
        },
      ]
    `);

    hydrateHomeServiceSummary(document.body, START);
    expect(readMessages()).toMatchInlineSnapshot(`
      [
        {
          "kind": "incident",
          "label": "Перебой",
          "phase": "active",
          "service": "water",
        },
        {
          "kind": "maintenance",
          "label": "Идут работы",
          "phase": "active",
          "service": "electricity",
        },
      ]
    `);
  });

  it('selects the next window and hides a service without one at the previous end', () => {
    renderSummary(
      JSON.stringify([
        {
          service: 'electricity',
          windows: [
            { kind: 'incident', start: START, end: END },
            { kind: 'maintenance', start: NEXT }
          ]
        },
        { service: 'water', windows: [{ kind: 'maintenance', start: START, end: END }] }
      ])
    );
    hydrateHomeServiceSummary(document, START);
    expect(readMessages()).toHaveLength(2);

    hydrateHomeServiceSummary(document, END);
    expect({
      hidden: getSummary().hidden,
      messages: readMessages(),
      hiddenServices: getLinks()
        .filter((link) => link.hidden)
        .map((link) => link.dataset.homeService)
    }).toMatchInlineSnapshot(`
      {
        "hidden": false,
        "hiddenServices": [
          "water",
          "internet",
          "dam",
        ],
        "messages": [
          {
            "kind": "maintenance",
            "label": "Работы с 9 октября",
            "phase": "scheduled",
            "service": "electricity",
          },
        ],
      }
    `);
  });

  it.each([
    { name: 'an empty journal', payload: '[]' },
    { name: 'the last window ending', payload: PAYLOAD }
  ])('hides every link and the outer summary for $name', ({ payload }) => {
    renderSummary(payload);

    hydrateHomeServiceSummary(document, END);

    expect({
      hidden: getSummary().hidden,
      allLinksHidden: getLinks().every((link) => link.hidden)
    }).toMatchInlineSnapshot(`
      {
        "allLinksHidden": true,
        "hidden": true,
      }
    `);
  });

  it('reveals the summary and reorders existing links for keyboard navigation', () => {
    renderSummary(
      JSON.stringify([
        { service: 'electricity', windows: [{ kind: 'maintenance', start: NEXT }] },
        { service: 'water', windows: [{ kind: 'maintenance', start: START }] },
        { service: 'internet', windows: [{ kind: 'incident', start: START }] },
        { service: 'dam', windows: [{ kind: 'incident', start: END }] }
      ])
    );
    getSummary().hidden = true;
    const originalLinks = getLinks();

    hydrateHomeServiceSummary(document, START);

    expect(getSummary().hidden).toBe(false);
    expect(readMessages()).toMatchInlineSnapshot(`
      [
        {
          "kind": "incident",
          "label": "Перебой",
          "phase": "active",
          "service": "internet",
        },
        {
          "kind": "maintenance",
          "label": "Идут работы",
          "phase": "active",
          "service": "water",
        },
        {
          "kind": "incident",
          "label": "Перебой с 7 октября",
          "phase": "scheduled",
          "service": "dam",
        },
        {
          "kind": "maintenance",
          "label": "Работы с 9 октября",
          "phase": "scheduled",
          "service": "electricity",
        },
      ]
    `);
    for (const link of getLinks()) {
      expect(originalLinks).toContain(link);
      expect(link.getAttribute('href')).toBe(`/status/${link.dataset.homeService}/`);
    }
  });

  it.each([
    { name: 'missing', payload: undefined },
    { name: 'empty', payload: '' },
    { name: 'malformed JSON', payload: '{' }
  ])('preserves the complete server snapshot when payload is $name', ({ payload }) => {
    renderSummary(payload);
    if (payload === undefined) document.querySelector('[data-home-service-windows]')?.remove();
    const serverHtml = document.body.innerHTML;

    hydrateHomeServiceSummary(document, END);

    expect(document.body.innerHTML).toBe(serverHtml);
  });
});

describe('installHomeServiceSummary', () => {
  it('uses the current Moscow year on reattachment in the same module', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-31T20:59:59Z'));
    renderSummary(
      JSON.stringify([
        {
          service: 'electricity',
          windows: [{ kind: 'maintenance', start: Date.parse('2026-12-31T22:00:00Z') }]
        }
      ])
    );

    installHomeServiceSummary();
    expect(readMessages()[0]?.label).toBe('Работы с 1 января 2027');

    vi.setSystemTime(new Date('2026-12-31T21:00:00Z'));
    document.dispatchEvent(new Event('astro:after-swap'));
    expect(readMessages()[0]?.label).toBe('Работы с 1 января');
  });

  it('hydrates each install but registers each navigation handler only once', () => {
    vi.useFakeTimers();
    renderSummary();
    let time = START - 1;
    const now = vi.fn(() => time);

    installHomeServiceSummary({ now });
    time = START;
    installHomeServiceSummary({ now });
    expect(now).toHaveBeenCalledTimes(2);
    expect(readMessages()[0]?.phase).toBe('active');
    expect(subscriptions.mock.calls.map(([event]) => event)).toMatchInlineSnapshot(`
      [
        "astro:after-swap",
        "astro:page-load",
      ]
    `);

    now.mockClear();
    document.dispatchEvent(new Event('astro:after-swap'));
    expect(now).toHaveBeenCalledTimes(1);
    now.mockClear();
    document.dispatchEvent(new Event('astro:page-load'));
    expect(now).toHaveBeenCalledTimes(1);

    now.mockClear();
    const attachedHtml = document.body.innerHTML;
    time = END;
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(now).not.toHaveBeenCalled();
    expect(document.body.innerHTML).toBe(attachedHtml);
  });

  it('finds fresh DOM on entry, navigation away and repeated return', () => {
    document.body.innerHTML = '<main>Another route</main>';
    let time = START - 1;
    installHomeServiceSummary({ now: () => time });

    renderSummary();
    document.dispatchEvent(new Event('astro:after-swap'));
    expect(readMessages()[0]?.phase).toBe('scheduled');
    const detachedSummary = getSummary();
    const attachedHtml = detachedSummary.outerHTML;

    document.body.innerHTML = '<main>Another route</main>';
    const otherRouteHtml = document.body.innerHTML;
    time = START;
    document.dispatchEvent(new Event('astro:after-swap'));
    document.dispatchEvent(new Event('astro:page-load'));
    expect(document.body.innerHTML).toBe(otherRouteHtml);
    expect(detachedSummary.outerHTML).toBe(attachedHtml);

    renderSummary();
    document.dispatchEvent(new Event('astro:after-swap'));
    expect(readMessages()[0]?.phase).toBe('active');

    document.body.innerHTML = '<main>Another route</main>';
    document.dispatchEvent(new Event('astro:page-load'));
    time = END;
    renderSummary();
    document.dispatchEvent(new Event('astro:page-load'));
    expect(getSummary().hidden).toBe(true);
  });
});

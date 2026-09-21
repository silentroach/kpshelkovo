// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { STATUS_AREAS } from '../schema';
import { hydrateStatusTimelines } from '../timeline.dom';
import { bindStatusTimelineLazyHydration } from '../timeline.lazy';

const renderTimeline = (root: Document): HTMLElement => {
  root.body.innerHTML = `
    <div data-status-timeline data-range-days="10">
      <div data-status-timeline-track>
        <button data-status-problem data-status-kind="incident" data-status-service="electricity"
          data-start="2026-05-09T03:00:00Z" data-end="2026-05-09T04:00:00Z"
          data-tooltip-service-label="Electricity" data-tooltip-kind-label="Incident"
          data-tooltip-title="Outage" data-tooltip-phase-label="scheduled"
          data-tooltip-period-label="03:00–04:00"></button>
      </div>
      <div id="tooltip" data-status-timeline-tooltip role="tooltip" aria-hidden="true" hidden>
        <p><span data-status-tooltip-title></span>
          <span data-status-tooltip-phase-icon-alert hidden></span>
          <span data-status-tooltip-phase-icon-check hidden></span>
          <span data-status-tooltip-title-areas hidden></span></p>
        <p data-status-tooltip-period></p>
        <div data-status-tooltip-list hidden></div>
        <div hidden>${STATUS_AREAS.map((area) => `<span data-status-tooltip-area-template="${area}"><span></span></span>`).join('')}</div>
      </div>
    </div>`;
  return root.querySelector<HTMLElement>('[data-status-problem]')!;
};

const setup = () => {
  const root = document.implementation.createHTMLDocument();
  const trigger = renderTimeline(root);
  const hydrate = vi.fn(hydrateStatusTimelines);
  const module = { hydrateStatusTimelines: hydrate };
  const pending = Promise.withResolvers<typeof module>();
  const load = vi.fn(() => pending.promise);
  bindStatusTimelineLazyHydration(root, load);
  return { root, trigger, hydrate, module, pending, load };
};

// Drain the current async operation, including its replay, without timing assumptions
// about the number of promise continuations inside the loader.
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const intent = (trigger: HTMLElement): boolean =>
  trigger.dispatchEvent(new Event('pointerover', { bubbles: true }));
const navigate = async (root: Document): Promise<void> => {
  root.dispatchEvent(new Event('astro:after-swap'));
  await settle();
  root.dispatchEvent(new Event('astro:page-load'));
  await settle();
};

afterEach(() => {
  delete window.__STATUS_TIMELINE_NOW__;
});

describe('timeline lazy navigation', () => {
  describe.each([
    { enter: 'pointerover', exit: 'pointerout', ExitEvent: PointerEvent },
    { enter: 'focusin', exit: 'focusout', ExitEvent: FocusEvent }
  ])('$enter lifetime', ({ enter, exit, ExitEvent }) => {
    it('cancels intent when leaving the marker before page-load', async () => {
      const { root, trigger, hydrate, pending, module } = setup();
      intent(trigger);
      pending.resolve(module);
      await settle();
      const next = renderTimeline(root);
      hydrate.mockClear();
      root.dispatchEvent(new Event('astro:after-swap'));
      next.dispatchEvent(new Event(enter, { bubbles: true }));
      next.dispatchEvent(new ExitEvent(exit, { bubbles: true, relatedTarget: root.body }));
      root.dispatchEvent(new Event('astro:page-load'));
      await settle();

      expect(hydrate).toHaveBeenCalledExactlyOnceWith(root);
      expect(root.querySelector<HTMLElement>('[role="tooltip"]')?.hidden).toBe(true);
    });

    it.each([false, true])(
      'cancels intent during module loading (navigation: %s)',
      async (navigation) => {
        const { root, trigger, hydrate, pending, module } = setup();
        if (navigation) {
          root.dispatchEvent(new Event('astro:after-swap'));
        }
        trigger.dispatchEvent(new Event(enter, { bubbles: true }));
        if (navigation) {
          root.dispatchEvent(new Event('astro:page-load'));
        }
        await settle();
        trigger.dispatchEvent(new ExitEvent(exit, { bubbles: true, relatedTarget: root.body }));
        pending.resolve(module);
        await settle();

        expect(hydrate).toHaveBeenCalledExactlyOnceWith(root);
        expect(root.querySelector<HTMLElement>('[role="tooltip"]')?.hidden).toBe(true);
      }
    );

    it('preserves intent when moving between descendants of the marker', async () => {
      const { root, trigger, hydrate, pending, module } = setup();
      const first = root.createElement('span');
      const second = root.createElement('span');
      trigger.append(first, second);
      root.dispatchEvent(new Event('astro:after-swap'));
      first.dispatchEvent(new Event(enter, { bubbles: true }));
      first.dispatchEvent(new ExitEvent(exit, { bubbles: true, relatedTarget: second }));
      root.dispatchEvent(new Event('astro:page-load'));
      await settle();
      second.dispatchEvent(new ExitEvent(exit, { bubbles: true, relatedTarget: trigger }));
      pending.resolve(module);
      await settle();

      expect(hydrate).toHaveBeenCalledExactlyOnceWith(root);
      expect(root.querySelector<HTMLElement>('[role="tooltip"]')?.hidden).toBe(false);
    });
  });

  it('keeps a tap intent when hover or focus ends during loading', async () => {
    const { root, trigger, pending, module } = setup();
    root.dispatchEvent(new Event('astro:after-swap'));
    trigger.dispatchEvent(new Event('touchstart', { bubbles: true }));
    trigger.dispatchEvent(
      new PointerEvent('pointerout', { bubbles: true, relatedTarget: root.body })
    );
    root.dispatchEvent(new Event('astro:page-load'));
    await settle();
    trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: root.body }));
    pending.resolve(module);
    await settle();

    expect(root.querySelector<HTMLElement>('[role="tooltip"]')?.hidden).toBe(false);
  });

  it.each(['pointerover', 'focusin', 'touchstart'])(
    'captures %s on new markers until page-load even when the module is already loaded',
    async (eventType) => {
      const { root, trigger, hydrate, pending, module, load } = setup();
      intent(trigger);
      pending.resolve(module);
      await settle();
      const next = renderTimeline(root);
      hydrate.mockClear();

      root.dispatchEvent(new Event('astro:after-swap'));
      next.dispatchEvent(new Event(eventType, { bubbles: true }));
      await settle();
      expect(hydrate).not.toHaveBeenCalled();

      root.dispatchEvent(new Event('astro:page-load'));
      await settle();
      expect(hydrate).toHaveBeenCalledExactlyOnceWith(root);
      expect(root.querySelector<HTMLElement>('[role="tooltip"]')?.hidden).toBe(false);
      expect(next.getAttribute('aria-describedby')).toBe('tooltip');
      expect(load).toHaveBeenCalledTimes(1);
    }
  );

  it.each([true, false])(
    'drops captured intent on the next swap (timelines: %s)',
    async (hasTimelines) => {
      const { root, trigger, hydrate, pending, module } = setup();
      intent(trigger);
      pending.resolve(module);
      await settle();
      const next = renderTimeline(root);
      hydrate.mockClear();
      root.dispatchEvent(new Event('astro:after-swap'));
      intent(next);
      const replay = vi.fn();
      next.addEventListener('mouseenter', replay);

      if (hasTimelines) {
        renderTimeline(root);
      } else {
        root.body.replaceChildren();
      }
      await navigate(root);
      expect(replay).not.toHaveBeenCalled();
      expect(hydrate).toHaveBeenCalledTimes(hasTimelines ? 1 : 0);
      expect(root.querySelector('[data-status-tooltip-open]')).toBeFalsy();
    }
  );

  it('defers a captured first intent until page-load without preloading', async () => {
    const { root, trigger, hydrate, pending, module, load } = setup();
    root.dispatchEvent(new Event('astro:after-swap'));
    intent(trigger);
    await settle();
    expect(load).not.toHaveBeenCalled();

    root.dispatchEvent(new Event('astro:page-load'));
    pending.resolve(module);
    await settle();
    expect(hydrate).toHaveBeenCalledExactlyOnceWith(root);
    expect(root.querySelector<HTMLElement>('[role="tooltip"]')?.hidden).toBe(false);
  });

  it('hydrates each new DOM once on navigation and return, reusing the module', async () => {
    const { root, trigger, hydrate, pending, module, load } = setup();
    intent(trigger);
    pending.resolve(module);
    await settle();
    expect(hydrate).toHaveBeenCalledTimes(1);

    for (const page of ['service', 'back']) {
      const next = renderTimeline(root);
      next.dataset.page = page;
      hydrate.mockClear();
      await navigate(root);
      expect(hydrate).toHaveBeenCalledExactlyOnceWith(root);
      expect(next.dataset.statusTooltipBound).toBe('true');
    }
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('shares pending interaction and navigation hydration, then opens the first tooltip', async () => {
    const { root, trigger, hydrate, pending, module } = setup();
    intent(trigger);
    await navigate(root);
    expect(hydrate).not.toHaveBeenCalled();
    pending.resolve(module);
    await settle();
    expect(hydrate).toHaveBeenCalledExactlyOnceWith(root);
    expect(root.querySelector<HTMLElement>('[role="tooltip"]')?.hidden).toBe(false);
  });

  it('hydrates the current DOM and replays only its intent after multiple replacements during loading', async () => {
    const { root, trigger, hydrate, pending, module } = setup();
    intent(trigger);
    const replay = vi.fn();
    trigger.addEventListener('mouseenter', replay);
    const intermediate = renderTimeline(root);
    await navigate(root);
    const current = renderTimeline(root);
    root.dispatchEvent(new Event('astro:after-swap'));
    current.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    const currentReplay = vi.fn();
    current.addEventListener('focusin', currentReplay);
    root.dispatchEvent(new Event('astro:page-load'));
    pending.resolve(module);
    await settle();

    expect(hydrate).toHaveBeenCalledExactlyOnceWith(root);
    expect(intermediate.dataset.statusTooltipBound).toBeUndefined();
    expect(current.dataset.statusTooltipBound).toBe('true');
    expect(replay).not.toHaveBeenCalled();
    expect(currentReplay).toHaveBeenCalledTimes(1);
    expect(root.querySelector<HTMLElement>('[role="tooltip"]')?.hidden).toBe(false);
  });

  it('skips hydration and detached intent after leaving timelines while loading', async () => {
    const { root, trigger, hydrate, pending, module, load } = setup();
    intent(trigger);
    const replay = vi.fn();
    trigger.addEventListener('mouseenter', replay);
    root.body.replaceChildren();
    await navigate(root);
    pending.resolve(module);
    await settle();
    expect(hydrate).not.toHaveBeenCalled();
    expect(replay).not.toHaveBeenCalled();

    renderTimeline(root);
    await navigate(root);
    expect(hydrate).toHaveBeenCalledExactlyOnceWith(root);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('stays lazy through navigation and retries a rejected load on the next intent', async () => {
    const { root, hydrate, pending, module, load } = setup();
    await navigate(root);
    const trigger = renderTimeline(root);
    await navigate(root);
    expect(load).not.toHaveBeenCalled();

    intent(trigger);
    await navigate(root);
    pending.reject(new Error('Module unavailable'));
    await settle();
    expect(hydrate).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(1);

    load.mockResolvedValue(module);
    intent(trigger);
    await settle();
    expect(root.querySelector<HTMLElement>('[role="tooltip"]')?.hidden).toBe(false);
    expect(hydrate).toHaveBeenCalledExactlyOnceWith(root);
    await navigate(root);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('uses page-load time when an incident starts or ends after the DOM swap', async () => {
    window.__STATUS_TIMELINE_NOW__ = Date.parse('2026-05-09T02:00:00Z');
    const { root, trigger, hydrate, pending, module } = setup();
    intent(trigger);
    pending.resolve(module);
    await settle();

    const states = [];
    for (const [before, after] of [
      ['2026-05-09T02:59:59Z', '2026-05-09T03:00:01Z'],
      ['2026-05-09T03:59:59Z', '2026-05-09T04:00:00Z']
    ] as const) {
      const current = renderTimeline(root);
      hydrate.mockClear();
      window.__STATUS_TIMELINE_NOW__ = Date.parse(before);
      root.dispatchEvent(new Event('astro:after-swap'));
      await settle();
      expect(hydrate).not.toHaveBeenCalled();

      window.__STATUS_TIMELINE_NOW__ = Date.parse(after);
      root.dispatchEvent(new Event('astro:page-load'));
      await settle();
      expect(hydrate).toHaveBeenCalledExactlyOnceWith(root);
      current.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      states.push({
        phase: current.dataset.tooltipPhaseLabel,
        label: current.getAttribute('aria-label'),
        describedBy: current.getAttribute('aria-describedby'),
        hidden: root.querySelector<HTMLElement>('[role="tooltip"]')?.hidden,
        alert: root.querySelector<HTMLElement>('[data-status-tooltip-phase-icon-alert]')?.hidden,
        check: root.querySelector<HTMLElement>('[data-status-tooltip-phase-icon-check]')?.hidden
      });
    }
    expect(states).toMatchInlineSnapshot(`
      [
        {
          "alert": false,
          "check": true,
          "describedBy": "tooltip",
          "hidden": false,
          "label": "Electricity. Incident. Outage. Статус: идет. 03:00–04:00",
          "phase": "идет",
        },
        {
          "alert": true,
          "check": false,
          "describedBy": "tooltip",
          "hidden": false,
          "label": "Electricity. Incident. Outage. Статус: восстановлено. 03:00–04:00",
          "phase": "восстановлено",
        },
      ]
    `);
  });

  it('uses module-ready time and preserves the first tooltip after a delayed load', async () => {
    window.__STATUS_TIMELINE_NOW__ = Date.parse('2026-05-09T02:59:59Z');
    const { root, trigger, hydrate, pending, module } = setup();
    intent(trigger);
    await navigate(root);
    window.__STATUS_TIMELINE_NOW__ = Date.parse('2026-05-09T04:00:00Z');
    pending.resolve(module);
    await settle();
    expect(hydrate).toHaveBeenCalledExactlyOnceWith(root);
    expect({
      phase: trigger.dataset.tooltipPhaseLabel,
      label: trigger.getAttribute('aria-label'),
      hidden: root.querySelector<HTMLElement>('[role="tooltip"]')?.hidden,
      check: root.querySelector<HTMLElement>('[data-status-tooltip-phase-icon-check]')?.hidden
    }).toMatchInlineSnapshot(`
      {
        "check": false,
        "hidden": false,
        "label": "Electricity. Incident. Outage. Статус: восстановлено. 03:00–04:00",
        "phase": "восстановлено",
      }
    `);
  });

  it('refreshes again when an early interaction finishes before page-load', async () => {
    window.__STATUS_TIMELINE_NOW__ = Date.parse('2026-05-09T03:59:59Z');
    const { root, trigger, hydrate, pending, module } = setup();
    intent(trigger);
    root.dispatchEvent(new Event('astro:after-swap'));
    pending.resolve(module);
    await settle();
    expect(trigger.dataset.tooltipPhaseLabel).toBe('идет');

    window.__STATUS_TIMELINE_NOW__ = Date.parse('2026-05-09T04:00:00Z');
    root.dispatchEvent(new Event('astro:page-load'));
    await settle();
    expect(trigger.dataset.tooltipPhaseLabel).toBe('восстановлено');
    expect(hydrate).toHaveBeenCalledTimes(2);
  });
});

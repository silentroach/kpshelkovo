/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { afterEach, expect, it, vi } from 'vitest';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import StatusServiceTimeline from '@/components/status/StatusServiceTimeline.astro';
import { createAstroContainer } from '@/test/astro-container';

import { bindStatusTimelineLazyHydration } from '../timeline.lazy';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('extends an SSR open incident through real lazy hydration and later navigation', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-05-10T00:00:00+03:00'));
  const container = await createAstroContainer();
  const html = await container.renderToString(StatusServiceTimeline, {
    props: {
      service: 'water',
      timelineDays: 10,
      incidents: [
        {
          id: 'open-incident',
          title: 'Open incident',
          kind: 'incident',
          phase: 'active',
          startedIso: '2026-05-08T00:00:00+03:00',
          startedHasTime: true,
          endedHasTime: false
        }
      ]
    }
  });
  const localWindow = new Window();
  try {
    vi.stubGlobal('window', localWindow);
    vi.stubGlobal('document', localWindow.document);
    vi.stubGlobal('Element', localWindow.Element);
    vi.stubGlobal('HTMLElement', localWindow.HTMLElement);
    vi.stubGlobal('Event', localWindow.Event);
    const rootDocument = document;
    rootDocument.body.innerHTML = html;
    const trigger = rootDocument.querySelector<HTMLElement>('[data-status-problem]');
    if (!trigger) {
      throw new Error('SSR problem segment is missing');
    }

    expect(trigger.dataset.end).toBeUndefined();
    expect(trigger.dataset.geometryEnd).toBe('2026-05-09T21:00:00.000Z');

    const readState = () => ({
      left: Number(trigger.style.getPropertyValue('--segment-left')),
      width: Number(trigger.style.getPropertyValue('--segment-width')),
      phase: trigger.dataset.tooltipPhaseLabel,
      green: Array.from(
        rootDocument.querySelectorAll<HTMLElement>('[data-status-segment="green"]'),
        (segment) => ({
          left: Number(segment.style.getPropertyValue('--segment-left')),
          width: Number(segment.style.getPropertyValue('--segment-width'))
        })
      )
    });

    window.__STATUS_TIMELINE_NOW__ = Date.parse('2026-05-11T00:00:00+03:00');
    bindStatusTimelineLazyHydration(rootDocument);
    trigger.dispatchEvent(new Event('pointerover', { bubbles: true }));
    await vi.waitFor(() => {
      expect(readState().left).toBe(70);
    });
    expect(readState()).toMatchInlineSnapshot(`
      {
        "green": [
          {
            "left": 0,
            "width": 70,
          },
        ],
        "left": 70,
        "phase": "идет",
        "width": 30,
      }
    `);

    window.__STATUS_TIMELINE_NOW__ = Date.parse('2026-05-12T00:00:00+03:00');
    rootDocument.dispatchEvent(new Event('astro:page-load'));
    await vi.waitFor(() => {
      expect(readState().left).toBe(60);
    });
    expect(readState()).toMatchInlineSnapshot(`
      {
        "green": [
          {
            "left": 0,
            "width": 60,
          },
        ],
        "left": 60,
        "phase": "идет",
        "width": 40,
      }
    `);
  } finally {
    await localWindow.happyDOM.close();
  }
});

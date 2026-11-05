/// <reference types="astro/client" />
import { Window } from 'happy-dom';
import { afterEach, expect, it, vi } from 'vitest';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import StatusServiceTimeline from '@/components/status/StatusServiceTimeline.astro';
import { createAstroContainer } from '@/test/astro-container';

import { buildStatusTimelineDays } from '../timeline';
import { buildStatusTimelineRecords } from '../timeline-data';
import { closeStatusTimelineDay, openStatusTimelineDay } from '../timeline.dom';
import { bindStatusTimelineLazyHydration } from '../timeline.lazy';
import type { StatusTimelineBalloonModule, StatusTimelineIncidentInput } from '../timeline.types';

afterEach(() => {
  closeStatusTimelineDay();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const setup = async (incidents: readonly StatusTimelineIncidentInput[]) => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-05-10T00:00:00+03:00'));
  const container = await createAstroContainer();
  const html = await container.renderToString(StatusServiceTimeline, {
    props: { service: 'water', timelineDays: 90, incidents }
  });
  const local = new Window();
  local.document.body.innerHTML = html;
  const media = local.matchMedia('(min-width: 64rem)');
  vi.spyOn(media, 'matches', 'get').mockReturnValue(true);
  vi.spyOn(local, 'matchMedia').mockReturnValue(media);
  vi.stubGlobal('AbortController', local.AbortController);
  vi.stubGlobal('window', local);
  vi.stubGlobal('document', local.document);
  vi.stubGlobal('Event', local.Event);
  return { local, html, media, doc: document };
};

const openRecord: StatusTimelineIncidentInput = {
  id: 'open',
  title: 'Open',
  kind: 'incident',
  phase: 'active',
  startedIso: '2026-05-08T10:00:00+03:00',
  startedHasTime: true,
  endedHasTime: false
};

it('updates real SSR markup on connection, keeps one time snapshot and connects new navigation DOM once', async () => {
  const { local, doc, html } = await setup([
    openRecord,
    { ...openRecord, id: 'future', startedIso: '2026-05-11T10:00:00+03:00', phase: 'scheduled' },
    { ...openRecord, id: 'finished', endedIso: '2026-05-10T12:00:00+03:00' }
  ]);
  try {
    window.__STATUS_TIMELINE_NOW__ = Date.parse('2026-05-11T12:00:00+03:00');
    const open = vi.fn();
    const loader = vi.fn(async () => ({
      openStatusTimelineDay: open,
      closeStatusTimelineDay: vi.fn()
    }));
    bindStatusTimelineLazyHydration(doc, loader);
    const control = doc.querySelector<HTMLInputElement>('[data-timeline-control]')!;
    const lastDay = () =>
      doc
        .querySelector('[data-timeline-view="desktop"] [data-timeline-grid]')!
        .lastElementChild?.getAttribute('data-day');
    expect(lastDay()).toBe('2026-05-11');
    expect(loader).not.toHaveBeenCalled();
    window.__STATUS_TIMELINE_NOW__ = Date.parse('2026-05-12T12:00:00+03:00');
    control.dispatchEvent(new Event('click', { bubbles: true }));
    await vi.waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(open.mock.calls[0][0].snapshot.days.at(-1)).toMatchInlineSnapshot(`
      {
        "id": "2026-05-11",
        "recordIds": [
          "open",
          "future",
        ],
        "tone": "red",
      }
    `);
    doc.dispatchEvent(new Event('astro:page-load'));
    expect(lastDay()).toBe('2026-05-11');
    doc.dispatchEvent(new Event('astro:before-swap'));
    doc.body.innerHTML = html;
    doc.dispatchEvent(new Event('astro:after-swap'));
    doc.dispatchEvent(new Event('astro:page-load'));
    expect(lastDay()).toBe('2026-05-12');
    expect(doc.querySelectorAll('[data-timeline-view="desktop"] [data-tone="red"]')).toHaveLength(
      5
    );
  } finally {
    await local.happyDOM.close();
  }
});

it('does not load on mobile and discards a pending desktop result after mode change', async () => {
  const { local, doc, media } = await setup([openRecord]);
  try {
    let finish!: (module: StatusTimelineBalloonModule) => void;
    const loader = vi.fn(
      () =>
        new Promise<StatusTimelineBalloonModule>((resolve) => {
          finish = resolve;
        })
    );
    bindStatusTimelineLazyHydration(doc, loader);
    const control = doc.querySelector<HTMLInputElement>('[data-timeline-control]')!;
    control.dispatchEvent(new Event('click'));
    vi.spyOn(media, 'matches', 'get').mockReturnValue(false);
    media.dispatchEvent(new local.Event('change'));
    const open = vi.fn();
    finish({ openStatusTimelineDay: open, closeStatusTimelineDay: vi.fn() });
    await Promise.resolve();
    await Promise.resolve();
    expect(open).not.toHaveBeenCalled();
    expect(control.hidden).toBe(true);
    control.dispatchEvent(new Event('click'));
    expect(loader).toHaveBeenCalledTimes(1);
  } finally {
    await local.happyDOM.close();
  }
});

it('updates phases within the same Moscow day only on connection and keeps completed history', async () => {
  const { local, doc, html } = await setup([
    {
      ...openRecord,
      id: 'same-day',
      startedIso: '2026-05-10T10:00:00+03:00',
      endedIso: '2026-05-10T11:00:00+03:00',
      endedHasTime: true,
      phase: 'scheduled'
    }
  ]);
  try {
    const cells = () => doc.querySelector('[data-timeline-view="desktop"] [data-timeline-grid]')!;
    const read = () => ({
      day: cells().lastElementChild?.getAttribute('data-day'),
      tone: cells().lastElementChild?.getAttribute('data-tone'),
      icon: doc
        .querySelector('[data-timeline-balloon] [data-phase-icon]')
        ?.getAttribute('data-phase-icon')
    });
    expect(read().tone).toBe('green');
    window.__STATUS_TIMELINE_NOW__ = Date.parse('2026-05-10T10:30:00+03:00');
    bindStatusTimelineLazyHydration(doc, async () => ({
      openStatusTimelineDay,
      closeStatusTimelineDay
    }));
    doc.querySelector<HTMLInputElement>('[data-timeline-control]')!.click();
    await vi.waitFor(() => expect(read().icon).toBe('alert'));
    const active = read();

    window.__STATUS_TIMELINE_NOW__ = Date.parse('2026-05-10T12:00:00+03:00');
    local.dispatchEvent(new local.Event('resize'));
    doc.dispatchEvent(new Event('visibilitychange'));
    doc.querySelector<HTMLInputElement>('[data-timeline-control]')!.click();
    await vi.waitFor(() => expect(read().icon).toBe('alert'));
    expect(read()).toEqual(active);

    doc.dispatchEvent(new Event('astro:before-swap'));
    doc.body.innerHTML = html;
    doc.dispatchEvent(new Event('astro:after-swap'));
    doc.querySelector<HTMLInputElement>('[data-timeline-control]')!.click();
    await vi.waitFor(() => expect(read().icon).toBe('check'));
    expect({ active, completed: read() }).toMatchInlineSnapshot(`
      {
        "active": {
          "day": "2026-05-10",
          "icon": "alert",
          "tone": "red",
        },
        "completed": {
          "day": "2026-05-10",
          "icon": "check",
          "tone": "red",
        },
      }
    `);
  } finally {
    await local.happyDOM.close();
  }
});

it('announces a loading failure, clears selection and does not retry the failed module', async () => {
  const { local, doc } = await setup([openRecord]);
  try {
    const loader = vi.fn().mockRejectedValue(new Error('Offline'));
    bindStatusTimelineLazyHydration(doc, loader);
    const control = doc.querySelector<HTMLInputElement>('[data-timeline-control]')!;
    control.value = '87';
    control.dispatchEvent(new Event('input'));
    const error = doc.querySelector<HTMLElement>('[data-timeline-error]')!;
    await vi.waitFor(() => expect(error.hidden).toBe(false));
    expect(doc.querySelector('[data-selected]')).toBeNull();
    control.dispatchEvent(new Event('click'));
    await Promise.resolve();
    await Promise.resolve();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(doc.querySelector('[data-timeline-balloon]:not([hidden])')).toBeNull();
  } finally {
    await local.happyDOM.close();
  }
});

it('does not open a detached component when loading finishes after navigation', async () => {
  const { local, doc, html } = await setup([openRecord]);
  try {
    let finish!: (module: StatusTimelineBalloonModule) => void;
    const loader = vi.fn(
      () =>
        new Promise<StatusTimelineBalloonModule>((resolve) => {
          finish = resolve;
        })
    );
    bindStatusTimelineLazyHydration(doc, loader);
    doc.querySelector<HTMLInputElement>('[data-timeline-control]')!.click();
    doc.dispatchEvent(new Event('astro:before-swap'));
    doc.body.innerHTML = html;
    doc.dispatchEvent(new Event('astro:after-swap'));
    const open = vi.fn();
    finish({ openStatusTimelineDay: open, closeStatusTimelineDay: vi.fn() });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(open).not.toHaveBeenCalled();
    doc.querySelector<HTMLInputElement>('[data-timeline-control]')!.click();
    await vi.waitFor(() => expect(open).toHaveBeenCalledTimes(1));
  } finally {
    await local.happyDOM.close();
  }
});

it('keeps both SSR windows readable, encodes titles once and opens all records with correct links and focus', async () => {
  const malicious = '<img src=x onerror=alert(1)>';
  const incidents: readonly StatusTimelineIncidentInput[] = [
    { ...openRecord, title: malicious, href: '/status/incidents/open/' },
    { ...openRecord, id: 'list-only', title: 'List only', kind: 'maintenance' },
    {
      ...openRecord,
      id: 'finished',
      startedIso: '2026-05-09T10:00:00+03:00',
      endedIso: '2026-05-09T11:30:00+03:00',
      endedHasTime: true,
      duration: { totalMinutes: 90 },
      phase: 'resolved'
    }
  ];
  const { local, doc } = await setup(incidents);
  try {
    expect(doc.querySelectorAll('[data-timeline-view="desktop"] [data-day]')).toHaveLength(90);
    expect(doc.querySelectorAll('[data-timeline-view="mobile"] [data-day]')).toHaveLength(30);
    expect(doc.querySelector('img')).toBeNull();
    const control = doc.querySelector<HTMLInputElement>('[data-timeline-control]')!;
    expect(control.hidden).toBe(true); // no inert SSR control
    const nowMs = Date.parse('2026-05-10T00:00:00+03:00');
    const records = buildStatusTimelineRecords(incidents, nowMs, 90);
    const snapshot = { nowMs, records, days: buildStatusTimelineDays(records, nowMs, 90) };
    control.hidden = false;
    const root = doc.querySelector<HTMLElement>('[data-status-timeline]')!;
    openStatusTimelineDay({ root, control, snapshot, index: 88 });
    const shell = root.querySelector<HTMLElement>('[data-timeline-balloon]')!;
    expect(shell.querySelectorAll('a').length).toBe(1);
    expect(shell.querySelector('a')?.getAttribute('href')).toBe('/status/incidents/open/');
    expect(shell.querySelector('img')).toBeNull();
    expect(shell.textContent?.replaceAll('\u00a0', '·')).toMatchInlineSnapshot(
      `"9 мая 2026 г.×List onlyПлановые работы идут. Начиная с·8·мая, 10:00<img src=x onerror=alert(1)>Инцидент продолжается. Начиная с·8·мая, 10:00OpenИнцидент завершён. 9·мая, 10:00·—·11:30 (1·ч. 30·мин.)"`
    );
    const close = shell.querySelector<HTMLButtonElement>('button')!;
    close.focus();
    close.click();
    expect(doc.activeElement).toBe(control);
    expect(shell.hidden).toBe(true);
    openStatusTimelineDay({ root, control, snapshot, index: 87 });
    expect(
      shell
        .querySelector('.status-service-timeline__event-meta')
        ?.textContent.replaceAll('\u00a0', '·')
    ).toContain('8·мая');
    openStatusTimelineDay({ root, control, snapshot, index: 0 });
    expect(shell.querySelectorAll('a')).toHaveLength(0);
    expect(shell.querySelector('[data-timeline-balloon-list]')?.textContent).toContain(
      'нет записей'
    );
  } finally {
    await local.happyDOM.close();
  }
});

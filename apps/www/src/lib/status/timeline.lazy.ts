import { buildStatusTimelineDays, formatTimelineDate, formatTimelineDay } from './timeline';
import type {
  StatusTimelineBalloonLoader,
  StatusTimelineBalloonModule,
  StatusTimelineRecords,
  StatusTimelineSnapshot
} from './timeline.types';

declare global {
  interface Window {
    __STATUS_TIMELINE_NOW__?: unknown;
  }
}

const boundDocuments = new WeakSet<Document>();

export const bindStatusTimelineLazyHydration = (
  rootDocument: Document = document,
  loadBalloon: StatusTimelineBalloonLoader = () => import('./timeline.dom')
): void => {
  if (boundDocuments.has(rootDocument)) return;
  boundDocuments.add(rootDocument);
  const connected = new WeakSet<HTMLElement>();
  const cleanups = new Set<() => void>();
  let pending: Promise<StatusTimelineBalloonModule> | undefined;
  let loaded: StatusTimelineBalloonModule | undefined;
  let failed = false;
  let revision = 0;

  const load = (): Promise<StatusTimelineBalloonModule | undefined> => {
    if (failed) return Promise.resolve(undefined);
    pending ??= loadBalloon();
    return pending
      .then((module) => {
        loaded = module;
        return module;
      })
      .catch(() => {
        failed = true;
        return undefined;
      });
  };

  const connect = (): void => {
    const override = rootDocument.defaultView?.__STATUS_TIMELINE_NOW__;
    const nowMs = typeof override === 'number' && Number.isFinite(override) ? override : Date.now();
    for (const root of rootDocument.querySelectorAll<HTMLElement>('[data-status-timeline]')) {
      if (connected.has(root)) continue;
      const control = root.querySelector<HTMLInputElement>('[data-timeline-control]');
      const balloon = root.querySelector('[data-timeline-balloon]');
      const error = root.querySelector<HTMLElement>('[data-timeline-error]');
      if (!control || !error) continue;
      const records = JSON.parse(root.dataset.timelineRecords!) as StatusTimelineRecords;
      const count = Number(root.dataset.rangeDays);
      connected.add(root);
      const snapshot: StatusTimelineSnapshot = {
        nowMs,
        records,
        days: buildStatusTimelineDays(records, nowMs, count)
      };
      const media = rootDocument.defaultView!.matchMedia('(min-width: 64rem)');
      const abort = new AbortController();
      const options = { signal: abort.signal };
      let selected = false;
      let focusWithin = false;

      root.addEventListener(
        'focusin',
        () => {
          focusWithin = true;
        },
        options
      );
      root.addEventListener(
        'focusout',
        (event) => {
          if (
            event.relatedTarget instanceof rootDocument.defaultView!.Node &&
            !root.contains(event.relatedTarget)
          )
            focusWithin = false;
        },
        options
      );
      rootDocument.addEventListener(
        'pointerdown',
        (event) => {
          if (!(event.target instanceof rootDocument.defaultView!.Node)) return;
          if (!root.contains(event.target)) focusWithin = false;
          if (selected && !control.contains(event.target) && !balloon?.contains(event.target)) {
            revision++;
            selected = false;
            updateValue();
          }
        },
        options
      );

      for (const view of root.querySelectorAll<HTMLElement>('[data-timeline-view]')) {
        const days =
          view.dataset.timelineView === 'desktop'
            ? snapshot.days
            : buildStatusTimelineDays(records, nowMs, 30);
        const grid = view.querySelector('[data-timeline-grid]');
        const text = view.querySelector('[data-timeline-text]');
        const start = view.querySelector('[data-timeline-start]');
        const end = view.querySelector('[data-timeline-end]');
        if (!grid || !text || !start || !end) continue;
        grid.replaceChildren(
          ...days.map((day) => {
            const cell = rootDocument.createElement('span');
            cell.dataset.day = day.id;
            cell.dataset.tone = day.tone;
            return cell;
          })
        );
        text.replaceChildren(
          ...days.map((day) => {
            const item = rootDocument.createElement('li');
            item.textContent = formatTimelineDay(day, records);
            return item;
          })
        );
        start.textContent = formatTimelineDate(days[0].id, true);
        end.textContent = formatTimelineDate(days.at(-1)!.id, true);
      }

      const updateValue = (): void => {
        const day = snapshot.days[Number(control.value)];
        if (!day) return;
        control.setAttribute('aria-valuetext', formatTimelineDay(day, records));
        root
          .querySelectorAll('[data-selected]')
          .forEach((cell) => cell.removeAttribute('data-selected'));
        if (selected)
          root
            .querySelector(`[data-timeline-view="desktop"] [data-day="${day.id}"]`)
            ?.setAttribute('data-selected', '');
      };

      const open = async (): Promise<void> => {
        if (!media.matches || !root.isConnected) return;
        selected = true;
        updateValue();
        const request = ++revision;
        const index = Number(control.value);
        const module = await load();
        if (request !== revision || !root.isConnected || !media.matches || !selected) return;
        if (!module) {
          selected = false;
          updateValue();
          error.hidden = false;
          return;
        }
        module.openStatusTimelineDay({ root, control, snapshot, index });
      };

      const modeChanged = (): void => {
        if (!media.matches) {
          const focused = rootDocument.activeElement;
          // A CSS media change can blur the hidden control before this callback.
          if (focusWithin || (focused && root.contains(focused))) {
            const context =
              root.closest('[data-status-service-card]')?.querySelector<HTMLElement>('h3') ??
              rootDocument.querySelector<HTMLElement>('h1');
            if (context) {
              context.tabIndex = -1;
              context.focus();
            }
          }
          revision++;
          loaded?.closeStatusTimelineDay();
          selected = false;
          focusWithin = false;
          control.value = String(count - 1);
          error.hidden = true;
        }
        control.hidden = !media.matches;
        updateValue();
      };
      const warm = (): void => {
        if (media.matches) void load();
      };
      control.addEventListener('pointerover', warm, options);
      control.addEventListener('focus', warm, options);
      control.addEventListener(
        'input',
        () => {
          void open();
        },
        options
      );
      control.addEventListener(
        'click',
        () => {
          void open();
        },
        options
      );
      control.addEventListener(
        'keydown',
        (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            void open();
          }
          if (event.key === 'Escape') {
            revision++;
            selected = false;
            loaded?.closeStatusTimelineDay();
            updateValue();
          }
        },
        options
      );
      media.addEventListener('change', modeChanged);
      cleanups.add(() => {
        abort.abort();
        media.removeEventListener('change', modeChanged);
        connected.delete(root);
      });
      modeChanged();
    }
  };

  rootDocument.addEventListener('astro:before-swap', () => {
    revision++;
    loaded?.closeStatusTimelineDay();
    cleanups.forEach((cleanup) => cleanup());
    cleanups.clear();
  });
  rootDocument.addEventListener('astro:after-swap', connect);
  rootDocument.addEventListener('astro:page-load', connect);
  connect();
};

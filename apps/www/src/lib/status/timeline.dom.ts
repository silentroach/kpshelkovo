import { resolveStatusIncidentPhase } from './lifecycle';
import { formatTimelineCount, formatTimelineDate } from './timeline';
import type { StatusTimelineBalloonInput } from './timeline.types';

let dismiss: (() => void) | undefined;
export const closeStatusTimelineDay = (): void => {
  dismiss?.();
};

export const openStatusTimelineDay = ({
  root,
  control,
  snapshot,
  index
}: StatusTimelineBalloonInput): void => {
  closeStatusTimelineDay();
  const day = snapshot.days[index];
  const shell = root.querySelector<HTMLElement>('[data-timeline-balloon]');
  const title = shell?.querySelector<HTMLElement>('[data-timeline-balloon-title]');
  const list = shell?.querySelector<HTMLElement>('[data-timeline-balloon-list]');
  const close = shell?.querySelector<HTMLButtonElement>('[data-timeline-close]');
  const cell = root.querySelector<HTMLElement>(
    `[data-timeline-view="desktop"] [data-day="${day?.id}"]`
  );
  if (!day || !shell || !title || !list || !close || !cell) return;
  const doc = root.ownerDocument;
  const win = doc.defaultView!;
  const icons = root.querySelector<HTMLTemplateElement>('[data-timeline-icons]');
  const cloneIcon = (selector: string): Node | undefined =>
    icons?.content.querySelector(selector)?.cloneNode(true);
  title.textContent = `${formatTimelineDate(day.id)} · ${formatTimelineCount(day.recordIds.length)}`;
  const items = day.recordIds.flatMap((id) => {
    const record = snapshot.records.find((item) => item.id === id);
    if (!record) return [];
    const phase = resolveStatusIncidentPhase(
      {
        kind: record.kind,
        start: Date.parse(record.startedIso),
        end: record.endedIso ? Date.parse(record.endedIso) : undefined
      },
      snapshot.nowMs
    );
    const item = doc.createElement('div');
    item.className = 'status-service-timeline__event';
    const heading = doc.createElement('p');
    heading.className = 'status-service-timeline__event-title';
    if (record.kind === 'incident') {
      const icon = cloneIcon(`[data-phase-icon="${phase === 'active' ? 'alert' : 'check'}"]`);
      if (icon) heading.append(icon);
    }
    if (record.href) {
      const link = doc.createElement('a');
      link.href = record.href;
      link.className = 'site-inline-link';
      link.textContent = record.title;
      heading.append(link);
    } else heading.append(doc.createTextNode(record.title));
    const meta = doc.createElement('p');
    meta.className = 'status-service-timeline__event-meta';
    const kind = record.kind === 'maintenance' ? 'Плановые работы' : 'Инцидент';
    const phaseLabel =
      record.kind === 'maintenance'
        ? phase === 'active'
          ? 'идут'
          : phase === 'resolved'
            ? 'завершены'
            : 'запланированы'
        : phase === 'active'
          ? 'продолжается'
          : phase === 'resolved'
            ? 'завершён'
            : 'ожидается';
    meta.textContent = `${kind} ${phaseLabel}. ${phase === 'active' ? (record.activePeriodLabel ?? record.periodLabel) : record.periodLabel}`;
    record.areas?.forEach((area) => {
      const icon = cloneIcon(`[data-area-icon="${area}"]`);
      if (icon) meta.append(icon);
    });
    item.append(heading, meta);
    return [item];
  });
  if (!items.length) {
    const empty = doc.createElement('p');
    empty.className = 'status-service-timeline__event-meta';
    empty.textContent = 'За этот день нет записей.';
    items.push(empty);
  }
  list.replaceChildren(...items);
  cell.setAttribute('data-selected', '');
  shell.hidden = false;
  const position = (): void => {
    const anchor = cell.getBoundingClientRect();
    const margin = 8;
    const gap = 10;
    const width = shell.getBoundingClientRect().width;
    const center = anchor.left + anchor.width / 2;
    const left = Math.max(margin, Math.min(center - width / 2, win.innerWidth - width - margin));
    const below = Math.max(0, win.innerHeight - anchor.bottom - gap - margin);
    const above = Math.max(0, anchor.top - gap - margin);
    const side = below >= Math.min(shell.scrollHeight, 300) || below >= above ? 'below' : 'above';
    const available = side === 'below' ? below : above;
    shell.style.setProperty('--list-height', `${Math.max(0, available - 68)}px`);
    const height = shell.getBoundingClientRect().height;
    shell.style.left = `${left}px`;
    shell.style.top = `${Math.max(margin, side === 'below' ? anchor.bottom + gap : anchor.top - gap - height)}px`;
    shell.style.setProperty(
      '--arrow-left',
      `${Math.max(8, Math.min(width - 16, center - left - 4))}px`
    );
    shell.dataset.side = side;
  };
  const abort = new AbortController();
  const finish = (restore = false): void => {
    const hadFocus = shell.contains(doc.activeElement);
    shell.hidden = true;
    cell.removeAttribute('data-selected');
    abort.abort();
    dismiss = undefined;
    if (restore && hadFocus && control.isConnected && !control.hidden) control.focus();
  };
  dismiss = () => finish();
  close.addEventListener('click', () => finish(true), { signal: abort.signal });
  doc.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(true);
      }
    },
    { signal: abort.signal }
  );
  doc.addEventListener(
    'pointerdown',
    (event) => {
      if (
        event.target instanceof win.Node &&
        !shell.contains(event.target) &&
        !control.contains(event.target)
      )
        finish();
    },
    { signal: abort.signal }
  );
  win.addEventListener('resize', position, { signal: abort.signal });
  // Reposition only the open overlay; no temporal calculation or animation.
  doc.addEventListener(
    'scroll',
    (event) => {
      if (event.target instanceof win.Node && shell.contains(event.target)) return;
      position();
    },
    { capture: true, passive: true, signal: abort.signal }
  );
  position();
};

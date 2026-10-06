import { getHomeServiceMessages, parseHomeServiceWindows } from './service-summary';
import type { HomeServiceSummaryOptions } from './service-summary.dom.types';

export const hydrateHomeServiceSummary = (
  root: ParentNode = document,
  now: number = Date.now()
): void => {
  const summary = root.querySelector('[data-home-service-summary]');
  if (!(summary instanceof HTMLElement)) return;

  const list = summary.querySelector('[data-home-service-list]');
  if (!(list instanceof HTMLElement)) return;

  const payload = root.querySelector('[data-home-service-windows]');
  if (!(payload instanceof HTMLScriptElement)) return;

  const windows = parseHomeServiceWindows(payload.textContent ?? undefined);
  if (!windows) return;

  const messages = getHomeServiceMessages(windows, now);
  const links = Array.from(list.querySelectorAll<HTMLAnchorElement>('a[data-home-service]'));

  for (const link of links) {
    link.hidden = !messages.some((message) => message.service === link.dataset.homeService);
  }

  messages.forEach((message, index) => {
    const link = links.find((item) => item.dataset.homeService === message.service);
    if (!link) return;

    link.dataset.phase = message.phase;
    link.dataset.kind = message.kind;

    const label = link.querySelector('[data-home-service-label]');
    if (label && label.textContent !== message.label) {
      label.textContent = message.label;
    }

    const current = list.children[index];
    if (current && current !== link) current.before(link);
  });

  summary.hidden = messages.length === 0;
};

export const installHomeServiceSummary = (options: HomeServiceSummaryOptions = {}): void => {
  const hydrate = (): void => hydrateHomeServiceSummary(document, options.now?.() ?? Date.now());

  if (window.__shelkovoHomeServiceSummaryHydration) {
    hydrate();
    return;
  }

  window.__shelkovoHomeServiceSummaryHydration = true;
  hydrate();
  document.addEventListener('astro:after-swap', hydrate);
  document.addEventListener('astro:page-load', hydrate);
};

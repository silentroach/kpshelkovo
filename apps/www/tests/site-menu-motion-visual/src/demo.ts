export {};

const details = document.querySelector<HTMLDetailsElement>('.site-header-menu');
const summary = details?.querySelector<HTMLElement>('summary');
const mobilePanel = details?.querySelector<HTMLElement>('.site-header-mobile-panel');
const dropdown = document.querySelector<HTMLElement>('[data-site-nav-dropdown]');
const button = dropdown?.querySelector<HTMLButtonElement>('[data-site-nav-dropdown-button]');
const desktopPanel = dropdown?.querySelector<HTMLElement>('[data-site-nav-dropdown-menu]');
const form = document.querySelector<HTMLFormElement>('.demo-controls');
const message = document.querySelector<HTMLElement>('[data-demo-message]');

if (!details || !summary || !mobilePanel || !dropdown || !button || !desktopPanel || !form) {
  throw new Error('Expected navigation demo elements');
}

dropdown.dataset.siteNavDropdownHydrated = 'true';

const setMobileOpen = (open: boolean): void => {
  details.open = open;
  mobilePanel.inert = !open;
};
const setDesktopOpen = (open: boolean): void => {
  dropdown.toggleAttribute('data-open', open);
  button.setAttribute('aria-expanded', String(open));
  desktopPanel.inert = !open;
};
const close = (): void => {
  setMobileOpen(false);
  setDesktopOpen(false);
};
close();

summary.addEventListener('click', (event) => {
  event.preventDefault();
  setMobileOpen(!details.open);
});
button.addEventListener('click', () => setDesktopOpen(!dropdown.hasAttribute('data-open')));
const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
dropdown.addEventListener('pointerenter', (event) => {
  if (hover.matches && event.pointerType === 'mouse') setDesktopOpen(true);
});
dropdown.addEventListener('pointerleave', (event) => {
  if (event.pointerType === 'mouse' && !dropdown.contains(document.activeElement))
    setDesktopOpen(false);
});
dropdown.addEventListener('focusout', (event) => {
  if (!(event.relatedTarget instanceof Node) || !dropdown.contains(event.relatedTarget))
    setDesktopOpen(false);
});
document.addEventListener('pointerdown', (event) => {
  if (!(event.target instanceof Node)) return;
  if (!details.contains(event.target)) setMobileOpen(false);
  if (!dropdown.contains(event.target)) setDesktopOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (details.open && details.contains(document.activeElement)) {
    setMobileOpen(false);
    summary.focus();
  }
  if (dropdown.hasAttribute('data-open')) {
    setDesktopOpen(false);
    button.focus();
  }
});
document.querySelector('.site-header')?.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('a');
  if (link) {
    event.preventDefault();
    if (mobilePanel.contains(link)) summary.focus();
    if (desktopPanel.contains(link)) button.focus();
    close();
    if (message)
      message.textContent = `Выбрано: ${link.textContent?.trim()}. В демо переход отключён.`;
  }
  if (event.target.closest('[data-search-trigger]')) event.preventDefault();
});
form.addEventListener('change', () => {
  close();
  const data = new FormData(form);
  document.body.dataset.effect = String(data.get('effect'));
  document.body.dataset.background = String(data.get('background'));
  document.body.toggleAttribute('data-reduce', data.has('reduce'));
  document.body.toggleAttribute('data-instant-close', data.has('instantClose'));
});
window.matchMedia('(min-width: 56rem)').addEventListener('change', close);

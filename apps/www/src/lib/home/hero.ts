import { isSunlight, type Coordinates } from '@shelkovo/geo';

declare global {
  interface Window {
    __shelkovoHomeHeroHydration?: boolean;
  }
}

const SHELKOVO_COORDINATES = {
  lat: 55.065422,
  lng: 37.733096,
} satisfies Coordinates;

export const getHomeHeroMode = (date = new Date()): 'day' | 'night' =>
  isSunlight(date, SHELKOVO_COORDINATES) ? 'day' : 'night';

export const hydrateHomeHero = (
  root: ParentNode = document,
  date = new Date(),
): void => {
  const shell = root.querySelector('[data-home-hero-mode]');
  const image = root.querySelector('[data-home-hero-image]');
  if (!(image instanceof HTMLImageElement)) return;

  const mode = getHomeHeroMode(date);
  const src = image.dataset[`${mode}Src`];
  const srcset = image.dataset[`${mode}Srcset`];

  if (shell instanceof HTMLElement) {
    shell.dataset.homeHeroMode = mode;
  }

  if (src && srcset) {
    image.srcset = srcset;
    image.src = src;
    image.hidden = false;
  }
};

export const installHomeHeroHydration = (
  options: { readonly now?: () => Date } = {},
): void => {
  const hydrate = (): void =>
    hydrateHomeHero(document, options.now?.() ?? new Date());

  if (window.__shelkovoHomeHeroHydration) {
    hydrate();
    return;
  }

  window.__shelkovoHomeHeroHydration = true;
  hydrate();
  document.addEventListener('astro:after-swap', hydrate);
  document.addEventListener('astro:page-load', hydrate);
};

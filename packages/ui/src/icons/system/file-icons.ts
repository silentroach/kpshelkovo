export const FILE_PDF_ICON_PATHS = [
  { className: 'ui-file-pdf-icon__page', d: 'M7.25 2.75h8l5.5 5.5v13H7.25z' },
  { className: 'ui-file-pdf-icon__label', d: 'M15.25 2.75v5.5h5.5' },
  {
    className: 'ui-file-pdf-icon__label',
    d: 'M9.25 17.75v-5h1.5a1.5 1.5 0 0 1 0 3h-1.5'
  },
  {
    className: 'ui-file-pdf-icon__label',
    d: 'M13.75 12.75v5h1a2.5 2.5 0 0 0 0-5h-1'
  },
  {
    className: 'ui-file-pdf-icon__label',
    d: 'M18.25 17.75v-5h2.5M18.25 15.25h2'
  }
] as const;

const FILE_PDF_ICON_MARKUP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 24" class="ui-file-link__icon" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${FILE_PDF_ICON_PATHS.map(({ className, d }) => `<path class="${className}" d="${d}"></path>`).join('')}</svg>`;

const fileExtension = (href: string): string | undefined => {
  try {
    const pathname = new URL(href, 'https://ui.invalid').pathname;

    return pathname.match(/\.([a-z0-9]+)$/iu)?.[1]?.toLowerCase();
  } catch {
    return;
  }
};

export const fileLinkIconMarkup = (href: string): string | undefined =>
  fileExtension(href) === 'pdf' ? FILE_PDF_ICON_MARKUP : undefined;

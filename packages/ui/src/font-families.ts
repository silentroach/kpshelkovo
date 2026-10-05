import type { AstroUserConfig } from 'astro';

const firaSans = {
  name: 'Fira Sans',
  cssVariable: '--font-fira-sans' as const,
  weights: [400, 600],
  styles: ['normal'],
  subsets: ['latin', 'cyrillic', 'latin-ext'],
  formats: ['woff2'],
  display: 'swap',
  optimizedFallbacks: true,
  fallbacks: ['system-ui']
} satisfies Omit<NonNullable<AstroUserConfig['fonts']>[number], 'provider'>;

const ptSerif = {
  name: 'PT Serif',
  cssVariable: '--font-pt-serif' as const,
  weights: [700],
  styles: ['normal'],
  subsets: ['latin', 'cyrillic', 'latin-ext'],
  formats: ['woff2'],
  display: 'swap',
  optimizedFallbacks: true,
  fallbacks: ['Georgia', 'serif']
} satisfies Omit<NonNullable<AstroUserConfig['fonts']>[number], 'provider'>;

export const wwwFontFamilies = [firaSans, ptSerif];

export const mediaFontFamilies = [
  { ...firaSans, weights: [600], subsets: ['cyrillic'] },
  { ...ptSerif, subsets: ['cyrillic'] }
] satisfies Array<Omit<NonNullable<AstroUserConfig['fonts']>[number], 'provider'>>;

export const fontPreloads = {
  firaSans: [
    { weight: 400, style: 'normal', subset: 'cyrillic' },
    { weight: 600, style: 'normal', subset: 'cyrillic' }
  ],
  ptSerif: [{ weight: 700, style: 'normal', subset: 'cyrillic' }]
};

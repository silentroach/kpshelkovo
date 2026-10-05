import type { AstroUserConfig } from 'astro';
import type { fontProviders } from 'astro/config';

export type LocalFontFamily = NonNullable<
  AstroUserConfig<never, never, [ReturnType<typeof fontProviders.local>]>['fonts']
>[number];

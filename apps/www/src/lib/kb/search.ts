import type { KbPage } from './types';

export const isKbPageSearchable = (
  page: Pick<KbPage, 'flags' | 'isSection'>,
): boolean =>
  !page.flags.includes('noindex') &&
  !page.flags.includes('exclude-from-site-search') &&
  !page.isSection;

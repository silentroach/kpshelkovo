import type { KbPage } from './types';

export const isKbPageSearchable = (
  page: Pick<KbPage, 'flags' | 'sourceId'>,
): boolean =>
  !page.flags.includes('noindex') &&
  !page.flags.includes('exclude-from-site-search') &&
  page.sourceId !== 'index' &&
  !page.sourceId.endsWith('/index');

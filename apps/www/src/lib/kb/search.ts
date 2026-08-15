import type { KbPage } from './types';

export const isKbPageSearchable = (
  page: Pick<KbPage, 'flags' | 'sourceId'>,
): boolean =>
  !page.flags.includes('noindex') &&
  page.sourceId !== 'index' &&
  !page.sourceId.endsWith('/index');

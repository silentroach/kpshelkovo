import { isAbsoluteUrl } from '@shelkovo/url';

import { AREAS, type Area } from '../areas';

export { isAbsoluteUrl };

export const NEWS_AREAS = AREAS;
export type NewsArea = Area;

const SPACE = /\s+/g;

export const normalizeTagLabel = (tag: string): string =>
  tag.trim().replace(SPACE, ' ');

export const normalizeTagKey = (tag: string): string =>
  normalizeTagLabel(tag).toLowerCase().replaceAll(' ', '-');

export const isAttachmentUrl = (value: string): boolean =>
  isAbsoluteUrl(value) || value.startsWith('/');

import { isAbsoluteUrl } from '@shelkovo/url';

import { AREAS, type Area } from '../areas';

export { isAbsoluteUrl };

export const STATUS_AREAS = AREAS;
export type StatusArea = Area;

export const STATUS_SERVICES = [
  'electricity',
  'water',
  'internet',
  'dam',
  'roads',
] as const;
export type StatusService = (typeof STATUS_SERVICES)[number];

export const STATUS_KINDS = ['incident', 'maintenance'] as const;
export type StatusKind = (typeof STATUS_KINDS)[number];

export const STATUS_SERVICE_STATES = ['green', 'amber', 'red'] as const;
export type StatusServiceState = (typeof STATUS_SERVICE_STATES)[number];

import type { StatusKind } from '@/lib/status/schema';

export const HOME_STATUS_STATES = ['green', 'amber', 'red'] as const;

export type HomeStatusState = (typeof HOME_STATUS_STATES)[number];

export interface HomeStatusWindow {
  readonly kind: StatusKind;
  readonly start: number;
  readonly end?: number;
}

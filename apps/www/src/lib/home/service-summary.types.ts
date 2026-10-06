import type * as z from 'zod/mini';

import type { StatusKind, StatusService } from '@/lib/status/schema';
import type { StatusIncident } from '@/lib/status/types';

import type { HomeServiceWindowsSchema } from './service-summary.schema';

export type HomeServiceIncident = Pick<StatusIncident, 'service' | 'kind' | 'started' | 'ended'>;

export type HomeServiceWindowsPayload = Readonly<z.infer<typeof HomeServiceWindowsSchema>>;

export interface HomeServiceMessage {
  readonly service: StatusService;
  readonly phase: 'active' | 'scheduled';
  readonly kind: StatusKind;
  readonly label: string;
  readonly start: number;
}

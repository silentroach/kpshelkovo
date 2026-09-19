import type { z } from 'zod';

import type { EventsPublicPayloadSchema, EventPublicSchema } from './public-schema';
import type { EventsDataset, EventMonth } from './types';

export type EventPublic = Readonly<z.infer<typeof EventPublicSchema>>;
export type EventsPublicPayload = Readonly<z.infer<typeof EventsPublicPayloadSchema>>;

export interface EventNewsReference {
  readonly url: string;
  readonly eventIds: readonly string[];
}

export type EventNewsLinks = ReadonlyMap<string, readonly string[]>;

export interface EventsBuildData {
  readonly data: EventsDataset;
  readonly now: Date;
  readonly startMonth?: EventMonth;
}

import type { EventRecord } from '@/lib/events/types';

export interface EventWidgetProps {
  readonly event: EventRecord;
  /** News embeddings keep their linked heading anchor and published ICS filename. */
  readonly newsSlug?: string;
}

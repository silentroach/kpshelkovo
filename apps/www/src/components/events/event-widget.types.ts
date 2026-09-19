import type { EventRecord } from '@/lib/events/types';

export interface EventWidgetProps {
  readonly event: EventRecord;
  /** В новости сохраняет якорь заголовка и опубликованное имя файла ICS. */
  readonly newsSlug?: string;
}

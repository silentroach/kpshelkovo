import type { PreprocessedSiteMarkdownBody } from '@/lib/markdown/render';
import type { EntityMentionTarget } from '@/lib/mentions';
import type { Place } from '@/lib/places/types';

import type { RawEvent } from './raw-schema';

export type EventCategory =
  | 'sport'
  | 'workshops'
  | 'games'
  | 'celebrations'
  | 'meetings'
  | 'community'
  | 'exhibitions'
  | 'other';
export type EventStatus = 'announced' | 'conditional' | 'cancelled';
export type EventTimePrecision = 'date' | 'datetime';
export type EventMonthView = 'calendar' | 'list';

export interface EventParticipant {
  readonly name: string;
  readonly type: 'organization' | 'person';
}

export interface EventCoordinates {
  readonly lat: number;
  readonly lng: number;
}

export interface EventRecord {
  readonly id: string;
  readonly eventSlug: string;
  readonly referenceKey: string;
  readonly title: string;
  readonly category: EventCategory;
  readonly status: EventStatus;
  readonly startsDate: string;
  readonly timePrecision: EventTimePrecision;
  readonly startsIso: string;
  readonly startsAt?: Date;
  readonly startsTime?: string;
  readonly endsAt?: Date;
  readonly endsIso?: string;
  readonly endsTime?: string;
  readonly through?: string;
  readonly sourceUrl: string;
  readonly body: PreprocessedSiteMarkdownBody;
  readonly mentions: readonly EntityMentionTarget[];
  readonly price?: string;
  readonly audience?: string;
  readonly place?: Place;
  readonly locationDetails?: string;
  readonly location?: string;
  readonly coordinates?: EventCoordinates;
  readonly organizer?: EventParticipant;
  readonly performer?: readonly EventParticipant[];
  readonly calendarUid: string;
  readonly url: string;
  readonly icsUrl?: string;
}

export interface EventEntry {
  readonly id: string;
  readonly data: RawEvent;
  readonly body?: string;
}

export interface EventDay {
  readonly date: string;
  readonly url: string;
  readonly events: readonly EventRecord[];
}

export interface EventMonth {
  readonly id: string;
  readonly year: number;
  readonly month: number;
  readonly days: readonly EventDay[];
  readonly events: readonly EventRecord[];
}

export interface EventCalendarProjection {
  readonly months: readonly EventMonth[];
  readonly days: readonly EventDay[];
  readonly byMonth: ReadonlyMap<string, EventMonth>;
  readonly byDay: ReadonlyMap<string, EventDay>;
}

export interface EventsDataset {
  readonly events: readonly EventRecord[];
  readonly byId: ReadonlyMap<string, EventRecord>;
  readonly calendar: EventCalendarProjection;
}

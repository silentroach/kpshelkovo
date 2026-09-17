export interface CalendarLocation {
  readonly name: string;
  readonly address?: string;
  readonly latitude: number;
  readonly longitude: number;
}

export interface CalendarEvent {
  readonly uid: string;
  readonly prodId: string;
  readonly timestamp: Date;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly location?: CalendarLocation;
}

export interface CalendarLocation {
  readonly name: string;
  readonly address?: string;
  readonly latitude?: number;
  readonly longitude?: number;
}

interface CalendarEventFields {
  readonly uid: string;
  readonly prodId: string;
  readonly timestamp: Date;
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly location?: CalendarLocation;
  readonly status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}

export type CalendarEvent = CalendarEventFields &
  (
    | { readonly timePrecision?: 'datetime'; readonly startsAt: Date; readonly endsAt: Date }
    | ({
        readonly timePrecision: 'date';
        readonly startsOn: string;
      } & (
        | { readonly endsOn: string; readonly durationDays?: never }
        | { readonly endsOn?: never; readonly durationDays: number }
      ))
  );

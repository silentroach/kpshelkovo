export interface ContentDateParts {
  readonly year: string;
  readonly month: string;
  readonly day: string;
}

export interface ContentDate extends ContentDateParts {
  readonly at: Date;
  readonly iso: string;
  readonly hasTime: boolean;
  readonly time?: string;
}

export interface ContentDateTime extends ContentDate {
  readonly hasTime: true;
  readonly time: string;
}

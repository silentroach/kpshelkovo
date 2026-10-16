import { dateTimeFromISO } from '@shelkovo/format';

export const formatDiscomfortDate = (dateIso: string): string =>
  `${dateTimeFromISO(dateIso).toFormat('d MMMM yyyy')} года`;

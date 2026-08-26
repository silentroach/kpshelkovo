import { formatDate } from '@shelkovo/format';

export const formatDiscomfortDate = (dateIso: string): string =>
  `${formatDate(dateIso)} года`;

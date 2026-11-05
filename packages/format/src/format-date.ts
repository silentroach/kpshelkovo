const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Moscow'
});

/**
 * Formats ISO date into Russian human-readable form.
 */
export const formatDate = (iso: string, now: Date = new Date()): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid DateTime';
  }

  const parts = dateFormatter.formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const year = parts.find((part) => part.type === 'year')?.value;
  const currentYear = dateFormatter.formatToParts(now).find((part) => part.type === 'year')?.value;

  return `${day} ${month}${year === currentYear ? '' : ` ${year}`}`;
};

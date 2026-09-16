import type { EventRecord } from './types';

const CRLF = '\r\n';
const MAX_CONTENT_LINE_BYTES = 75;
const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const TEXT_ESCAPE = /\r\n|\r|\n|[\\;,]/g;
const PARAM_ESCAPE = /\r\n|\r|\n|[\\"]/g;
const encoder = new TextEncoder();

const escapeText = (value: string): string =>
  value.replace(TEXT_ESCAPE, (match) => {
    if (match === '\\') {
      return '\\\\';
    }

    if (match === ';') {
      return '\\;';
    }

    if (match === ',') {
      return '\\,';
    }

    return '\\n';
  });

const foldLine = (line: string): string => {
  const parts: string[] = [];
  let part = '';
  let bytes = 0;
  let limit = MAX_CONTENT_LINE_BYTES;

  for (const char of line) {
    const charBytes = encoder.encode(char).length;

    if (part && bytes + charBytes > limit) {
      parts.push(part);
      part = char;
      bytes = charBytes;
      limit = MAX_CONTENT_LINE_BYTES - 1;
      continue;
    }

    part += char;
    bytes += charBytes;
  }

  parts.push(part);

  return parts.map((item, index) => (index === 0 ? item : ` ${item}`)).join(CRLF);
};

const textLine = (name: string, value: string): string => foldLine(`${name}:${escapeText(value)}`);

const rawLine = (value: string): string => foldLine(value);

const parameterValue = (value: string): string =>
  `"${value.replace(PARAM_ESCAPE, (match) => {
    if (match === '\\') {
      return '\\\\';
    }

    if (match === '"') {
      return '\\"';
    }

    return ' ';
  })}"`;

const formatUtcDateTime = (value: Date): string => {
  if (Number.isNaN(value.valueOf())) {
    throw new Error('ICS date must be valid');
  }

  const iso = value.toISOString();

  return `${iso.slice(0, 10).replaceAll('-', '')}T${iso.slice(11, 19).replaceAll(':', '')}Z`;
};

const structuredLocation = (event: EventRecord): string | undefined => {
  if (!event.coordinates) {
    return undefined;
  }

  const title = parameterValue(event.location ?? event.title);

  return `X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-APPLE-RADIUS=100;X-TITLE=${title}:geo:${event.coordinates.lat},${event.coordinates.lng}`;
};

export const buildEventIcs = (
  event: EventRecord,
  siteUrl: string,
  stamp: Date,
  url = event.url
): string => {
  if (!event.startsAt && !event.through) {
    throw new Error(`event "${event.id}" has no calendar export: time is unknown`);
  }
  const host = new URL(siteUrl).host;
  const appleLocation = structuredLocation(event);
  const fallback = !!event.startsAt && !event.endsAt;
  const description = [
    event.status === 'cancelled'
      ? 'Отменено.'
      : event.status === 'conditional'
        ? 'При наборе группы.'
        : '',
    event.body,
    fallback ? 'Точное окончание неизвестно. Два часа выделены условно для личного календаря.' : ''
  ]
    .filter(Boolean)
    .join('\n\n');
  const interval = event.startsAt
    ? [
        `DTSTART:${formatUtcDateTime(event.startsAt)}`,
        `DTEND:${formatUtcDateTime(event.endsAt ?? new Date(event.startsAt.valueOf() + DEFAULT_EVENT_DURATION_MS))}`
      ]
    : [
        `DTSTART;VALUE=DATE:${event.startsDate.replaceAll('-', '')}`,
        // ICS DATE has a four-digit year; duration preserves the final supported day.
        event.through === '9999-12-31'
          ? `DURATION:P${(Date.parse(event.through) - Date.parse(event.startsDate)) / DAY_MS + 1}D`
          : `DTEND;VALUE=DATE:${new Date(Date.parse(`${event.through}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10).replaceAll('-', '')}`
      ];
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    rawLine(`PRODID:-//${host}//Events//RU`),
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    textLine('UID', event.calendarUid),
    rawLine(`DTSTAMP:${formatUtcDateTime(stamp)}`),
    ...interval,
    `STATUS:${event.status === 'cancelled' ? 'CANCELLED' : event.status === 'conditional' ? 'TENTATIVE' : 'CONFIRMED'}`,
    textLine('SUMMARY', event.title),
    textLine('DESCRIPTION', description),
    rawLine(`URL:${new URL(url, siteUrl).href}`),
    ...(event.location ? [textLine('LOCATION', event.location)] : []),
    ...(event.coordinates
      ? [rawLine(`GEO:${event.coordinates.lat};${event.coordinates.lng}`)]
      : []),
    ...(appleLocation ? [rawLine(appleLocation)] : []),
    'END:VEVENT',
    'END:VCALENDAR',
    ''
  ];

  return lines.join(CRLF);
};

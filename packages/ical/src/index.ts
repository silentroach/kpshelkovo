import type { CalendarEvent } from './types';

export type { CalendarEvent, CalendarLocation } from './types';

const CRLF = '\r\n';
const encoder = new TextEncoder();
const coordinateFormat = new Intl.NumberFormat('en-US', {
  useGrouping: false,
  maximumSignificantDigits: 21
});

const normalizeNewlines = (value: string): string => value.replace(/\r\n?/g, '\n');

const escapeText = (value: string): string =>
  normalizeNewlines(value).replace(/[\\;,\n]/g, (char) => (char === '\n' ? '\\n' : `\\${char}`));

const parameterValue = (value: string): string =>
  `"${normalizeNewlines(value).replaceAll('^', '^^').replaceAll('"', "^'").replaceAll('\n', '^n')}"`;

const foldLine = (line: string): string => {
  const parts: string[] = [];
  let part = '';
  let bytes = 0;

  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    if (bytes + charBytes > 75) {
      parts.push(part);
      part = ' ';
      bytes = 1;
    }
    part += char;
    bytes += charBytes;
  }

  parts.push(part);
  return parts.join(CRLF);
};

const formatUtcDateTime = (value: Date): string => {
  if (Number.isNaN(value.valueOf())) {
    throw new Error('ICS date must be valid');
  }

  const iso = value.toISOString();
  return `${iso.slice(0, 10).replaceAll('-', '')}T${iso.slice(11, 19).replaceAll(':', '')}Z`;
};

export function renderEventIcs(event: CalendarEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${escapeText(event.prodId)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeText(event.uid)}`,
    `DTSTAMP:${formatUtcDateTime(event.timestamp)}`,
    `DTSTART:${formatUtcDateTime(event.startsAt)}`,
    `DTEND:${formatUtcDateTime(event.endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `URL:${event.url}`
  ];

  if (event.location) {
    const { name, address, latitude, longitude } = event.location;
    const lat = coordinateFormat.format(latitude);
    const lng = coordinateFormat.format(longitude);
    lines.push(
      `LOCATION:${escapeText([name, address].filter(Boolean).join(', '))}`,
      `GEO:${lat};${lng}`,
      `X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-APPLE-RADIUS=100;X-TITLE=${parameterValue(name)}:geo:${lat},${lng}`
    );
  }

  lines.push('END:VEVENT', 'END:VCALENDAR', '');
  return lines.map(foldLine).join(CRLF);
}

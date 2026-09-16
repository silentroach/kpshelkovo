import type { SchemaDoc } from '@shelkovo/seo';

import type { EventParticipant, EventRecord } from './types';

const participantSchema = (person: EventParticipant): SchemaDoc => ({
  '@type': person.type === 'person' ? 'Person' : 'Organization',
  name: person.name
});

export const buildEventJsonLd = (event: EventRecord, siteUrl: string): SchemaDoc => {
  const url = new URL(event.url, siteUrl).href;
  const state =
    event.status === 'cancelled'
      ? 'Отменено. '
      : event.status === 'conditional'
        ? 'При наборе группы. '
        : '';
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': url,
    url,
    mainEntityOfPage: url.split('#')[0],
    name: event.title,
    description: [
      `${state}${event.body}`,
      event.price ? `Цена: ${event.price}.` : undefined,
      event.audience ? `Участники: ${event.audience}.` : undefined
    ]
      .filter(Boolean)
      .join(' '),
    inLanguage: 'ru-RU',
    startDate: event.timePrecision === 'date' ? event.startsDate : event.startsIso,
    endDate: event.through ?? event.endsIso,
    eventStatus:
      event.status === 'conditional'
        ? undefined
        : `https://schema.org/${event.status === 'cancelled' ? 'EventCancelled' : 'EventScheduled'}`,
    subjectOf: { '@type': 'WebPage', url: event.sourceUrl },
    location:
      event.location || event.coordinates
        ? {
            '@type': 'Place',
            name: event.location,
            geo: event.coordinates
              ? {
                  '@type': 'GeoCoordinates',
                  latitude: event.coordinates.lat,
                  longitude: event.coordinates.lng
                }
              : undefined
          }
        : undefined,
    organizer: event.organizer ? participantSchema(event.organizer) : undefined,
    performer: event.performer?.map(participantSchema)
  };
};

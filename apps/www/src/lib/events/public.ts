import type {
  EventNewsLinks,
  EventNewsReference,
  EventPublic,
  EventsPublicPayload
} from './public-types';
import type { EventRecord } from './types';

export const buildEventNewsLinks = (articles: readonly EventNewsReference[]): EventNewsLinks => {
  const links = new Map<string, string[]>();
  for (const article of articles) {
    for (const id of article.eventIds) {
      const urls = links.get(id) ?? [];
      if (!urls.includes(article.url)) urls.push(article.url);
      links.set(id, urls);
    }
  }
  return links;
};

export const toEventPublic = (
  event: EventRecord,
  siteUrl: string,
  newsLinks?: EventNewsLinks
): EventPublic => {
  const fields = {
    id: event.id,
    url: new URL(event.url, siteUrl).href,
    title: event.title,
    category: event.category,
    status: event.status,
    sourceUrl: event.sourceUrl,
    bodyMarkdown: event.body,
    price: event.price,
    audience: event.audience,
    location: event.location,
    coordinates: event.coordinates
      ? { lat: event.coordinates.lat, lng: event.coordinates.lng }
      : undefined,
    organizer: event.organizer
      ? { name: event.organizer.name, type: event.organizer.type }
      : undefined,
    performer: event.performer?.map((person) => ({ name: person.name, type: person.type })),
    newsUrls: (newsLinks?.get(event.id) ?? []).map((url) => new URL(url, siteUrl).href),
    icsUrl: event.icsUrl ? new URL(event.icsUrl, siteUrl).href : undefined
  };
  return event.timePrecision === 'datetime'
    ? { ...fields, timePrecision: 'datetime', startsAt: event.startsIso, endsAt: event.endsIso }
    : { ...fields, timePrecision: 'date', startsAt: event.startsDate, through: event.through };
};

export const buildEventsPublicPayload = (
  events: readonly EventRecord[],
  siteUrl: string,
  newsLinks?: EventNewsLinks
): EventsPublicPayload => ({
  schemaVersion: 1,
  events: events.map((event) => toEventPublic(event, siteUrl, newsLinks))
});

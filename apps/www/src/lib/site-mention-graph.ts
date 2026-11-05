import { createContactMentionRefs } from './contacts/mentions';
import { createEventMentionRefs } from './events/mentions';
import { createKbPageMentionRefs } from './kb/mentions';
import { createEntityMentionGraph, type EntityMentionGraph } from './mentions';
import { createNewsArticleMentionRefs } from './news/mentions';
import { createPersonProfileMentionRefs } from './people/mention-refs';
import { loadPeopleData } from './people/registry';
import { createPlaceMentionRefs } from './places/mentions';
import { createReviewMentionRefs } from './reviews/mentions';
import { createStatusIncidentMentionRefs } from './status/mentions';

let cache: Promise<EntityMentionGraph> | undefined;

const buildSiteMentionGraph = async (): Promise<EntityMentionGraph> => {
  const [
    { loadContactsData },
    { loadNewsData },
    { loadStatusData },
    { loadReviewsData },
    { loadPlacesData },
    { loadEventsData },
    people,
    { loadKbPages }
  ] = await Promise.all([
    import('./contacts/load'),
    import('./news/load'),
    import('./status/load'),
    import('./reviews/load'),
    import('./places/load'),
    import('./events/load'),
    loadPeopleData(),
    import('./kb/load')
  ]);
  const [contacts, news, status, reviews, places, events, kbPages] = await Promise.all([
    loadContactsData(),
    loadNewsData(),
    loadStatusData(),
    loadReviewsData(),
    loadPlacesData(),
    loadEventsData(),
    loadKbPages()
  ]);

  return createEntityMentionGraph([
    ...contacts.contacts.flatMap(createContactMentionRefs),
    ...news.articles.flatMap(createNewsArticleMentionRefs),
    ...events.events.flatMap(createEventMentionRefs),
    ...status.incidents.flatMap(createStatusIncidentMentionRefs),
    ...reviews.reviews.flatMap(createReviewMentionRefs),
    ...places.places.flatMap(createPlaceMentionRefs),
    ...people.profiles.flatMap(createPersonProfileMentionRefs),
    ...kbPages.flatMap(createKbPageMentionRefs)
  ]);
};

export const loadSiteMentionGraph = (): Promise<EntityMentionGraph> => {
  cache ??= buildSiteMentionGraph();

  return cache;
};

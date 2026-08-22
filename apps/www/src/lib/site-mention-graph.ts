import { createContactMentionRefs } from './contacts/mentions';
import { createDiscomfortMentionRefs } from './discomfort/mentions';
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
    { loadDiscomfortData },
    people,
  ] = await Promise.all([
    import('./contacts/load'),
    import('./news/load'),
    import('./status/load'),
    import('./reviews/load'),
    import('./places/load'),
    import('./discomfort/load'),
    loadPeopleData(),
  ]);
  const [contacts, news, status, reviews, places, discomfort] =
    await Promise.all([
      loadContactsData(),
      loadNewsData(),
      loadStatusData(),
      loadReviewsData(),
      loadPlacesData(),
      loadDiscomfortData(),
    ]);

  return createEntityMentionGraph([
    ...contacts.contacts.flatMap(createContactMentionRefs),
    ...news.articles.flatMap(createNewsArticleMentionRefs),
    ...status.incidents.flatMap((incident) =>
      incident.hasPage ? createStatusIncidentMentionRefs(incident) : [],
    ),
    ...reviews.reviews.flatMap(createReviewMentionRefs),
    ...places.places.flatMap(createPlaceMentionRefs),
    ...createDiscomfortMentionRefs(discomfort),
    ...people.profiles.flatMap(createPersonProfileMentionRefs),
  ]);
};

export const loadSiteMentionGraph = (): Promise<EntityMentionGraph> => {
  cache ??= buildSiteMentionGraph();

  return cache;
};

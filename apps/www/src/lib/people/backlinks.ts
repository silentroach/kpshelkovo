import {
  createSiteBacklinksFromGraph,
  type EntityMentionGraph,
} from '../mentions';
import type { PersonBacklinks, PersonProfile } from './types';

export const createPeopleBacklinksFromGraph = (
  graph: EntityMentionGraph,
  profile: Pick<PersonProfile, 'slug'>,
): PersonBacklinks =>
  createSiteBacklinksFromGraph(graph, {
    type: 'person',
    slug: profile.slug,
  });

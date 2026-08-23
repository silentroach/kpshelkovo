import {
  createSiteBacklinksFromGraph,
  type EntityMentionGraph,
} from '@/lib/mentions';

import type { PlaceBacklinks } from './types';

export const createPlaceBacklinksFromGraph = (
  graph: EntityMentionGraph,
  slug: string,
): PlaceBacklinks =>
  createSiteBacklinksFromGraph(graph, { type: 'place', slug });

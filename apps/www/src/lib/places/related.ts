import { compareRuText } from '@shelkovo/format';

import { getStatusIncidentState } from '@/lib/status/lifecycle';
import type { StatusDataset, StatusIncident } from '@/lib/status/types';
import { formatStatusIncidentPeriodText } from '@/lib/status/view';

import type {
  PlaceRelatedMaterial,
  PlaceRelatedMaterials,
  PlaceStatusContext,
  PlaceStatusMaterial
} from './related-types';
import type { PlaceMentionRef, PlaceWithBacklinks } from './types';

export const getPlaceStatusContext = (incident: StatusIncident): PlaceStatusContext => {
  const state = getStatusIncidentState(incident);
  const label =
    incident.kind === 'maintenance' && incident.phase === 'active'
      ? 'Плановые работы'
      : state.label.charAt(0).toLocaleUpperCase('ru') + state.label.slice(1);
  return {
    state: {
      phase: state.phase,
      label,
      tone: incident.phase === 'scheduled' ? 'info' : state.tone,
      isActive: state.isActive
    },
    period: formatStatusIncidentPeriodText(incident)
  };
};

const compareRefs = (a: PlaceMentionRef, b: PlaceMentionRef): number =>
  compareRuText(a.title, b.title) ||
  compareRuText(a.section, b.section) ||
  compareRuText(a.sourceId, b.sourceId);

const priorityRank = (incident: StatusIncident): number =>
  incident.phase === 'scheduled' ? 2 : incident.kind === 'incident' ? 0 : 1;

const comparePriority = (a: PlaceStatusMaterial, b: PlaceStatusMaterial): number =>
  priorityRank(a.incident) - priorityRank(b.incident) ||
  (a.incident.phase === 'scheduled'
    ? a.incident.sortStartedAt - b.incident.sortStartedAt
    : b.incident.sortStartedAt - a.incident.sortStartedAt) ||
  compareRefs(a.ref, b.ref);

const materialDate = (material: PlaceRelatedMaterial): number =>
  material.incident?.sortStartedAt ??
  (material.ref.mentionedAt ? Date.parse(material.ref.mentionedAt) : 0);

const selectKnowledge = (
  refs: readonly PlaceMentionRef[],
  random: () => number
): readonly PlaceMentionRef[] => {
  const pool = [...new Map(refs.map((ref) => [ref.sourceId, ref])).values()];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(random() * (index + 1));
    [pool[index], pool[selected]] = [pool[selected]!, pool[index]!];
  }
  return pool.slice(0, 3).sort(compareRefs);
};

/** Build-only HTML projection. Never changes the full backlinks used by Markdown. */
export const selectPlaceRelatedMaterials = (
  place: PlaceWithBacklinks,
  status: Pick<StatusDataset, 'byId'>,
  random: () => number = Math.random
): PlaceRelatedMaterials => {
  const statuses = place.backlinks.status.map((ref): PlaceStatusMaterial => {
    const incident = status.byId.get(ref.sourceId);
    if (!incident)
      throw new Error(`place "${place.slug}" references missing status "${ref.sourceId}"`);
    return { ref, incident };
  });
  const priority = statuses
    .filter(
      ({ incident }) =>
        incident.phase !== 'resolved' && incident.affectedPlaces?.includes(place.slug)
    )
    .sort(comparePriority);
  const priorityIds = new Set(priority.map(({ ref }) => ref.sourceId));
  const history = [
    ...place.backlinks.news.map((ref): PlaceRelatedMaterial => ({ ref })),
    ...statuses.filter(({ ref }) => !priorityIds.has(ref.sourceId))
  ]
    .sort((a, b) => materialDate(b) - materialDate(a) || compareRefs(a.ref, b.ref))
    .slice(0, 3);

  return { priority, knowledge: selectKnowledge(place.backlinks.kb, random), history };
};

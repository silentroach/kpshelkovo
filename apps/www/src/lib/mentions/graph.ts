import type {
  EntityMentionGraph,
  EntityMentionGraphTarget,
  EntityMentionSourceRef,
  EntityMentionType,
  SiteMentionSection,
} from './types';

import { compareRuText } from '@shelkovo/format';

const targetKey = (type: EntityMentionType, slug: string): string =>
  `${type}:${slug}`;

const sourceUnitKey = (ref: EntityMentionSourceRef): string =>
  `${targetKey(ref.target.type, ref.target.slug)}:${ref.source.section}:${ref.source.kind}:${ref.source.id}`;

const compareRefs = (
  a: EntityMentionSourceRef,
  b: EntityMentionSourceRef,
): number =>
  (b.sortKey ?? Number.NEGATIVE_INFINITY) -
    (a.sortKey ?? Number.NEGATIVE_INFINITY) ||
  compareRuText(a.title, b.title) ||
  compareRuText(a.source.id, b.source.id);

const assertNotSelfLink = (ref: EntityMentionSourceRef): void => {
  if (
    ref.sourceEntity?.type === ref.target.type &&
    ref.sourceEntity.slug === ref.target.slug
  ) {
    throw new Error(
      `self-link mention ref ${targetKey(ref.target.type, ref.target.slug)}`,
    );
  }
};

const createGraphTarget = (
  type: EntityMentionType,
  slug: string,
): EntityMentionGraphTarget => ({
  type,
  slug,
  sections: new Map(),
});

export const createEntityMentionGraph = (
  refs: readonly EntityMentionSourceRef[],
): EntityMentionGraph => {
  const targets = new Map<string, EntityMentionGraphTarget>();
  const seen = new Set<string>();

  for (const ref of refs) {
    assertNotSelfLink(ref);

    const unitKey = sourceUnitKey(ref);

    if (seen.has(unitKey)) {
      continue;
    }

    seen.add(unitKey);

    const key = targetKey(ref.target.type, ref.target.slug);
    const target =
      targets.get(key) ?? createGraphTarget(ref.target.type, ref.target.slug);
    const sections = new Map(target.sections);
    const current = sections.get(ref.source.section) ?? [];

    sections.set(ref.source.section, [...current, ref].sort(compareRefs));
    targets.set(key, { ...target, sections });
  }

  return { targets };
};

export const getEntityMentionGraphRefs = (
  graph: EntityMentionGraph,
  type: EntityMentionType,
  slug: string,
  sourceSection: SiteMentionSection,
): readonly EntityMentionSourceRef[] =>
  graph.targets.get(targetKey(type, slug))?.sections.get(sourceSection) ?? [];

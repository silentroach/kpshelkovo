import type { MapSelectionSet, ResolvedMapSelectionSet } from './types';

export const resolveMapSelectionSets = (
  definitions: readonly MapSelectionSet[]
): readonly ResolvedMapSelectionSet[] => {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const completed = new Map<string, ResolvedMapSelectionSet>();
  const resolving: string[] = [];

  const resolve = (id: string, sourceId: string): ResolvedMapSelectionSet => {
    const cached = completed.get(id);
    if (cached) return cached;

    const cycleStart = resolving.indexOf(id);
    if (cycleStart !== -1) {
      throw new Error(
        `map selection set "${sourceId}" contains cycle: ${[...resolving.slice(cycleStart), id].join(' -> ')}`
      );
    }

    const definition = byId.get(id);
    if (!definition) {
      throw new Error(
        `map selection set "${sourceId}" references unknown set "${id}" in chain: ${[...resolving, id].join(' -> ')}`
      );
    }

    resolving.push(id);
    const parcelCodes = new Set(definition.parcelCodes);
    const placeSlugs = new Set(definition.placeSlugs);
    for (const childId of definition.setIds) {
      const child = resolve(childId, sourceId);
      child.parcelCodes.forEach((code) => parcelCodes.add(code));
      child.placeSlugs.forEach((slug) => placeSlugs.add(slug));
    }
    resolving.pop();

    if (parcelCodes.size + placeSlugs.size === 0)
      throw new Error(
        `map selection set "${sourceId}" resolves to an empty set via: ${[...resolving, id].join(' -> ')}`
      );

    const result: ResolvedMapSelectionSet = {
      id,
      parcelCodes: [...parcelCodes].sort(),
      placeSlugs: [...placeSlugs].sort(),
      outline: definition.outline,
      geometry: definition.geometry
    };
    completed.set(id, result);
    return result;
  };

  return definitions.map((definition) => resolve(definition.id, definition.id));
};

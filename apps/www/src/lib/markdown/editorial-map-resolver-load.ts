import { hasEditorialMapReferences } from './editorial-maps';
import type { EditorialMapSelectionResolver } from './editorial-maps.types';

/** Keep registry loading outside the synchronous Markdown pipeline and ordinary text pages. */
export const loadEditorialMapResolverForMarkdown = async (
  markdown: string,
  source: string
): Promise<EditorialMapSelectionResolver | undefined> => {
  if (!hasEditorialMapReferences(markdown, source)) return;
  const { loadEditorialMapSelectionResolver } =
    await import('@/lib/geometry/editorial-map-selection-load');
  return loadEditorialMapSelectionResolver();
};

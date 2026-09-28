import { md, parseMarkdownFragment } from '@shelkovo/markdown';
import type { z } from 'zod';

import { roundGeometry } from '@/lib/geometry/coordinate-precision';
import { RawEditorialGeometrySchema } from '@/lib/geometry/editorial-schema';

import { editorialMapCaption, transformEditorialMapNodes } from './editorial-maps';

type MarkdownNode = ReturnType<typeof parseMarkdownFragment>[number];

/** Add one plain-text caption after each original map code node; do not modify the body. */
export const appendEditorialMapCaptions = (
  nodes: readonly MarkdownNode[],
  source: string
): readonly MarkdownNode[] =>
  transformEditorialMapNodes(nodes, source, (node, map) => {
    const caption = editorialMapCaption(map);
    const original = JSON.parse(node.value) as z.input<typeof RawEditorialGeometrySchema>;
    const prepared = {
      ...original,
      features: original.features.map((feature) => ({
        ...feature,
        geometry: roundGeometry(feature.geometry)
      }))
    };
    const changed = prepared.features.some(
      (feature, index) =>
        JSON.stringify(feature.geometry.coordinates) !==
        JSON.stringify(original.features[index]?.geometry.coordinates)
    );
    if (changed) {
      const result = RawEditorialGeometrySchema.safeParse(prepared);
      if (!result.success) {
        throw new Error(
          `${source} map insertion ${map.index} is invalid after coordinate rounding: ${result.error.message}`
        );
      }
    }

    return [
      md.code(
        changed ? JSON.stringify(prepared, undefined, 2) : node.value,
        node.lang ?? undefined,
        node.meta ?? undefined
      ),
      ...(caption ? [md.paragraph(map.url ? [md.link(map.url, caption)] : [md.text(caption)])] : [])
    ];
  });

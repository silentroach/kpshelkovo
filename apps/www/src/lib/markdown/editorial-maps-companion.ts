import { md, parseMarkdownFragment } from '@shelkovo/markdown';
import type { z } from 'zod';

import { roundGeometry, roundPosition } from '@/lib/geometry/coordinate-precision';
import { toPublicEditorialGeometry } from '@/lib/geometry/editorial-public';
import { RawEditorialGeometrySchema } from '@/lib/geometry/editorial-schema';

import type { EditorialMapSourceSchema } from './editorial-map-source-schema';
import {
  editorialMapCaption,
  resolveEditorialMapSelection,
  transformEditorialMapNodes
} from './editorial-maps';
import type { EditorialMapSelectionResolver } from './editorial-maps.types';

type MarkdownNode = ReturnType<typeof parseMarkdownFragment>[number];

/** Expand short maps and add one caption in the companion AST, leaving source Markdown intact. */
export const appendEditorialMapCaptions = (
  nodes: readonly MarkdownNode[],
  source: string,
  resolver?: EditorialMapSelectionResolver
): readonly MarkdownNode[] =>
  transformEditorialMapNodes(nodes, source, (node, map) => {
    const caption = editorialMapCaption(map);
    if (map.selection) {
      const resolved = resolveEditorialMapSelection(map, source, resolver);
      // The extractor validated this node; retain numeric strings and expansion settings.
      const original = JSON.parse(node.value) as z.input<typeof EditorialMapSourceSchema>;
      const imported = resolved.geometry.features.length
        ? toPublicEditorialGeometry(resolved.geometry).features
        : [];
      const prepared = {
        type: 'FeatureCollection' as const,
        metadata: original.metadata,
        features: [
          ...imported.map((feature) => ({ ...feature, geometry: roundGeometry(feature.geometry) })),
          ...resolved.parcelLabels.map((label) => ({
            type: 'Feature' as const,
            properties: { iconCaption: label.text },
            geometry: { type: 'Point' as const, coordinates: roundPosition(label.coordinates) }
          })),
          ...(original.features ?? []).map((feature) => ({
            ...feature,
            geometry: roundGeometry(feature.geometry)
          }))
        ]
      };
      const result = RawEditorialGeometrySchema.safeParse(prepared);
      if (!result.success) {
        throw new Error(
          `${source} map insertion ${map.index} is invalid after coordinate rounding: ${result.error.message}`
        );
      }
      return [
        md.code(
          JSON.stringify(prepared, undefined, 2),
          node.lang ?? undefined,
          node.meta ?? undefined
        ),
        ...(caption
          ? [md.paragraph(map.url ? [md.link(map.url, caption)] : [md.text(caption)])]
          : [])
      ];
    }
    // JSON.parse drops trailing zeroes; propagate raw literal precision through nested arrays.
    const longDecimals = new WeakSet<object>();
    let longCoordinateLiteral = false;
    const original = JSON.parse(
      node.value,
      function (this: unknown, key: string, value: unknown, context?: { readonly source: string }) {
        if (Array.isArray(this)) {
          if (typeof value === 'number') {
            if (!context)
              throw new Error(`${source} map insertion ${map.index}: JSON source unavailable`);
            if (/\.\d{9}/u.test(context.source)) longDecimals.add(this);
          } else if (Array.isArray(value) && longDecimals.has(value)) {
            longDecimals.add(this);
          }
        }
        if (key === 'coordinates' && Array.isArray(value) && longDecimals.has(value)) {
          longCoordinateLiteral = true;
        }
        return value;
      }
    ) as z.input<typeof RawEditorialGeometrySchema>;
    const prepared = {
      ...original,
      features: original.features.map((feature) => ({
        ...feature,
        geometry: roundGeometry(feature.geometry)
      }))
    };
    const changed =
      longCoordinateLiteral ||
      prepared.features.some(
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

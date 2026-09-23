import { defaultTreeAdapter, parse } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

import type { ParcelPart } from './schema.ts';
import { GenplanPagePlotSchema, GenplanSnapshotSchema } from './source-schemas.ts';
import type { GenplanSnapshot } from './source-schemas.ts';

export const parseGenplanPage = (
  html: string,
  part: ParcelPart,
  page: string,
  capturedAt: string
): GenplanSnapshot => {
  const scripts: string[] = [];
  const visit = (node: DefaultTreeAdapterMap['parentNode']): void => {
    if (defaultTreeAdapter.isElementNode(node) && node.tagName === 'script') {
      const text = (defaultTreeAdapter.getChildNodes(node) ?? [])
        .filter(defaultTreeAdapter.isTextNode)
        .map(defaultTreeAdapter.getTextNodeContent)
        .join('')
        .trim();
      if (text.includes("window['houses_data']")) scripts.push(text);
    }
    for (const child of defaultTreeAdapter.getChildNodes(node))
      if (defaultTreeAdapter.isElementNode(child)) visit(child);
  };
  visit(parse(html));
  if (scripts.length !== 1)
    throw new Error(
      `${page}: expected exactly one houses_data assignment, found ${scripts.length}`
    );
  const json = /^window\['houses_data'\]\s*=\s*(\[[\s\S]*\]);?$/.exec(scripts[0] ?? '')?.[1];
  if (!json) throw new Error(`${page}: unsupported houses_data script`);
  const source = GenplanPagePlotSchema.array().min(1).parse(JSON.parse(json));
  return GenplanSnapshotSchema.parse({
    part,
    page,
    capturedAt,
    plots: source.map((plot) => ({
      id: plot.id,
      cadastralReference: plot.cadastral_number ?? undefined,
      status: plot.status,
      location: plot.location,
      objectprice: plot.objectprice ?? undefined
    }))
  });
};

import type { APIRoute, GetStaticPaths } from 'astro';

import { loadInventoryData } from '@/lib/inventory/load';
import { buildInventoryKindMarkdown } from '@/lib/inventory/markdown';
import { createMarkdownResponse } from '@/lib/markdown/response';

export const prerender = true;

export const getStaticPaths = (async () => {
  const data = await loadInventoryData();
  return data.kinds.map((kind) => ({ params: { group: kind.group, kind: kind.id } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const data = await loadInventoryData();
  const kind = data.byKind.get(params.kind ?? '');
  if (!kind || kind.group !== params.group) {
    throw new Error(`inventory kind "${params.group}/${params.kind}" not found`);
  }
  return createMarkdownResponse(buildInventoryKindMarkdown(kind));
};

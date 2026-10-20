import type { APIRoute, GetStaticPaths } from 'astro';

import { loadInventoryData } from '@/lib/inventory/load';
import { buildInventoryGroupMarkdown } from '@/lib/inventory/markdown';
import { createMarkdownResponse } from '@/lib/markdown/response';

export const prerender = true;

export const getStaticPaths = (async () => {
  const data = await loadInventoryData();
  return data.groups.map((group) => ({ params: { group: group.id } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const data = await loadInventoryData();
  const group = data.groups.find((entry) => entry.id === params.group);
  if (!group) throw new Error(`inventory group "${params.group}" not found`);
  return createMarkdownResponse(buildInventoryGroupMarkdown(group));
};

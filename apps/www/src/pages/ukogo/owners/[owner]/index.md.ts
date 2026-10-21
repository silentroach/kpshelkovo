import type { APIRoute, GetStaticPaths } from 'astro';

import { loadInventoryData } from '@/lib/inventory/load';
import { buildInventoryOwnerMarkdown } from '@/lib/inventory/markdown';
import { createMarkdownResponse } from '@/lib/markdown/response';

export const prerender = true;

export const getStaticPaths = (async () => {
  const data = await loadInventoryData();
  return data.owners.map((owner) => ({ params: { owner: owner.id } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const data = await loadInventoryData();
  const owner = data.byOwner.get(params.owner ?? '');
  if (!owner) {
    throw new Error(`inventory owner "${params.owner}" not found`);
  }
  return createMarkdownResponse(buildInventoryOwnerMarkdown(owner, data));
};

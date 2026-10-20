import type { APIRoute, GetStaticPaths } from 'astro';

import { loadInventoryData } from '@/lib/inventory/load';
import { buildInventoryOfferMarkdown } from '@/lib/inventory/markdown';
import { createMarkdownResponse } from '@/lib/markdown/response';

export const prerender = true;

export const getStaticPaths = (async () => {
  const data = await loadInventoryData();
  return data.kinds.flatMap((kind) =>
    kind.offers.map((offer) => ({
      params: { group: kind.group, kind: kind.id, offer: offer.id }
    }))
  );
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const data = await loadInventoryData();
  const kind = data.byKind.get(params.kind ?? '');
  const offer = kind?.offers.find((item) => item.id === params.offer);
  if (!kind || kind.group !== params.group || !offer) {
    throw new Error(`inventory offer "${params.group}/${params.kind}/${params.offer}" not found`);
  }
  return createMarkdownResponse(buildInventoryOfferMarkdown(offer));
};

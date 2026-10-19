import type { APIRoute } from 'astro';

import { createJsonResponse } from '@/lib/json-response';
import { loadMapSelectionSet, loadMapSelectionSets } from '@/lib/map-selection-sets/load';

export const prerender = true;

export const getStaticPaths = async () =>
  (await loadMapSelectionSets()).map(({ id }) => ({ params: { id } }));

export const GET: APIRoute = async ({ params }) => {
  const set = params.id ? await loadMapSelectionSet(params.id) : undefined;
  if (!set) return new Response('Not found', { status: 404 });
  return createJsonResponse(set, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
};

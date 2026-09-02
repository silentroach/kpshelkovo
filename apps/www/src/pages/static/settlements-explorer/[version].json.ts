import type { APIRoute, GetStaticPaths } from 'astro';

import { loadExplorerSnapshot } from '@/compare/lib/explorer-snapshot';

export const prerender = true;

export const getStaticPaths = (async () => {
  const snapshot = await loadExplorerSnapshot();

  return [{ params: { version: snapshot.version } }];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async () => {
  const snapshot = await loadExplorerSnapshot();

  return new Response(snapshot.body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};

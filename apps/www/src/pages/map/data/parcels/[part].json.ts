import type { APIRoute, GetStaticPaths } from 'astro';

import { loadParcelsData } from '@/lib/parcels/load';
import { buildParcelMapPayload, splitParcelMapPayload } from '@/lib/parcels/map-public';
import { PARCEL_PARTS } from '@/lib/parcels/schema';

export const prerender = true;

export const getStaticPaths = (async () => {
  const parts = splitParcelMapPayload(buildParcelMapPayload((await loadParcelsData()).parcels));
  return PARCEL_PARTS.map((part) => ({
    params: { part },
    props: { body: JSON.stringify(parts[part]) }
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ body: string }> = ({ props }) =>
  new Response(props.body, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });

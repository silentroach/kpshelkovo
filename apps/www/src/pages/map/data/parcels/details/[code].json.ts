import type { APIRoute, GetStaticPaths } from 'astro';

import { buildParcelDetailsPayload } from '@/lib/parcels/details-public';
import { loadParcelsData } from '@/lib/parcels/load';

export const prerender = true;

export const getStaticPaths = (async () =>
  (await loadParcelsData()).parcels
    .filter(({ status }) => status === 'available' || status === 'reserved')
    .map((parcel) => ({
      params: { code: parcel.code },
      props: { body: JSON.stringify(buildParcelDetailsPayload(parcel)) }
    }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ body: string }> = ({ props }) =>
  new Response(props.body, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });

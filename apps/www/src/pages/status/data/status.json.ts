import type { APIRoute } from 'astro';

import { canonRoot } from '@/lib/site';
import { links } from '@/lib/status/discovery';
import { loadStatusData } from '@/lib/status/load';
import { buildStatusPublicPayload } from '@/lib/status/public-dto';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(buildStatusPublicPayload(await loadStatusData()));

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Link: links(root),
    },
  });
};

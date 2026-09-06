import type { APIRoute } from 'astro';

import { loadAllData } from '@/compare/lib/data';
import { links } from '@/compare/lib/discovery';
import { toFullPayload } from '@/compare/lib/full';
import { canonRoot } from '@/compare/lib/site';
import { createJsonResponse } from '@/lib/json-response';

export const prerender = true;

export const GET: APIRoute = async () => {
  const data = await loadAllData();
  const root = canonRoot();
  const body = toFullPayload(data);

  return createJsonResponse(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Link: links(root),
    },
  });
};

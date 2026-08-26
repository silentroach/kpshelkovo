import type { APIRoute } from 'astro';

import { buildPeoplePayload, links } from '@/lib/people/discovery';
import { loadPeopleDataWithBacklinks } from '@/lib/people/load';
import { canonRoot } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const root = canonRoot();
  const body = JSON.stringify(
    buildPeoplePayload(await loadPeopleDataWithBacklinks()),
  );

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Link: links(root),
    },
  });
};

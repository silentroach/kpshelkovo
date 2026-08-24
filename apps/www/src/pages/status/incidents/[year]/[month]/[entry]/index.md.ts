import type { APIRoute, GetStaticPaths } from 'astro';
import { padNumber } from '@shelkovo/format';

import { createMarkdownResponse } from '@/lib/markdown/response';
import {
  loadStatusIncidentDetail,
  loadStatusIncidentDetails,
} from '@/lib/status/load';
import { buildStatusIncidentMarkdown } from '@/lib/status/markdown';

export const prerender = true;

export const getStaticPaths = (async () => {
  const incidents = await loadStatusIncidentDetails();

  return incidents.map((item) => ({
    params: {
      year: String(item.year),
      month: padNumber(item.month),
      entry: item.slug,
    },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const year = params.year;
  const month = params.month;
  const entry = params.entry;

  if (!year || !month || !entry) {
    throw new Error('status incident params are required');
  }

  const incident = await loadStatusIncidentDetail(`${year}/${month}/${entry}`);

  if (!incident) {
    throw new Error(`status incident "${year}/${month}/${entry}" not found`);
  }

  return createMarkdownResponse(buildStatusIncidentMarkdown(incident));
};

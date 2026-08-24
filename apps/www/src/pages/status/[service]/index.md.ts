import type { APIRoute, GetStaticPaths } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadStatusService } from '@/lib/status/load';
import { buildStatusServiceMarkdown } from '@/lib/status/markdown';
import { STATUS_SERVICES, type StatusService } from '@/lib/status/schema';

export const prerender = true;

export const getStaticPaths = (async () =>
  STATUS_SERVICES.map((service) => ({
    params: { service },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const serviceParam = params.service;

  if (!serviceParam) {
    throw new Error('status service param is required');
  }

  const service = STATUS_SERVICES.find((item) => item === serviceParam) as
    StatusService | undefined;

  if (!service) {
    throw new Error(`status service "${serviceParam}" not found`);
  }

  const summary = await loadStatusService(service);

  if (!summary) {
    throw new Error(`status service "${service}" not found`);
  }

  return createMarkdownResponse(buildStatusServiceMarkdown(summary));
};

import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { buildEstimateDetailChecksMarkdown } from '@/lib/reglament/detail-markdown';

export const prerender = true;

export const GET: APIRoute = async () =>
  createMarkdownResponse(buildEstimateDetailChecksMarkdown());

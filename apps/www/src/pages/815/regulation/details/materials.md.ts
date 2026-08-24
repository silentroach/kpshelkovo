import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { buildEstimateDetailMaterialsMarkdown } from '@/lib/reglament/detail-markdown';

export const prerender = true;

export const GET: APIRoute = async () =>
  createMarkdownResponse(buildEstimateDetailMaterialsMarkdown());

import type { APIRoute } from 'astro';

import { buildFullReglamentServicesMarkdown } from '@/lib/reglament/full-markdown';
import { createMarkdownResponse } from '@/lib/markdown/response';

export const prerender = true;

export const GET: APIRoute = async () =>
  createMarkdownResponse(buildFullReglamentServicesMarkdown());

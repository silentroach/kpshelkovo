import type { APIRoute } from 'astro';

import { estimate2026 } from '@/data/reglament/estimate-2026';
import { createMarkdownResponse } from '@/lib/markdown/response';
import { buildReglamentMarkdown } from '@/lib/reglament/markdown';

export const prerender = true;

export const GET: APIRoute = async () =>
  createMarkdownResponse(buildReglamentMarkdown(estimate2026));

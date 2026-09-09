import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { buildFullReglamentServiceMapMarkdown } from '@/lib/reglament/full-markdown';

export const prerender = true;

export const GET: APIRoute = async () =>
  createMarkdownResponse(buildFullReglamentServiceMapMarkdown());

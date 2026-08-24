import type { APIRoute } from 'astro';

import { buildHomeMarkdown } from '@/lib/llms';
import { createMarkdownResponse } from '@/lib/markdown/response';

export const prerender = true;

export const GET: APIRoute = async () =>
  createMarkdownResponse(await buildHomeMarkdown());

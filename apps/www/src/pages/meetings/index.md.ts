import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadMeetings } from '@/lib/meetings/load';
import { buildMeetingsIndexMarkdown } from '@/lib/meetings/markdown';

export const prerender = true;

export const GET: APIRoute = async () =>
  createMarkdownResponse(buildMeetingsIndexMarkdown(await loadMeetings()));

import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadPeopleProfilesWithBacklinks } from '@/lib/people/load';
import { buildPeopleHomeMarkdown } from '@/lib/people/markdown';

export const prerender = true;

export const GET: APIRoute = async () =>
  createMarkdownResponse(buildPeopleHomeMarkdown(await loadPeopleProfilesWithBacklinks()));

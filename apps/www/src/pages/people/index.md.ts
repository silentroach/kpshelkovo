import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { buildPeopleHomeMarkdown } from '@/lib/people/markdown';
import { loadPeopleProfilesWithBacklinks } from '@/lib/people/load';

export const prerender = true;

export const GET: APIRoute = async () =>
  createMarkdownResponse(
    buildPeopleHomeMarkdown(await loadPeopleProfilesWithBacklinks()),
  );
